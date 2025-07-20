import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Standardized API response types
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    field?: string;
    timestamp: string;
    requestId: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

// Error codes for consistent handling
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource Management
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // External APIs
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

// HTTP status code mappings
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export class ApiErrorHandler {
  /**
   * Create a standardized error response
   */
  static createErrorResponse(
    error: unknown,
    statusCode: number = STATUS_CODES.INTERNAL_SERVER_ERROR,
    requestId: string = crypto.randomUUID(),
  ): NextResponse<ApiErrorResponse> {
    const errorCode = this.mapErrorCode(error, statusCode);
    const userMessage = this.getUserFriendlyMessage(error);
    const details = error instanceof Error ? error.message : 'Unknown error';

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: userMessage,
        details,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    // Add field information for validation errors
    if (error instanceof ZodError && error.issues.length > 0) {
      errorResponse.error.field = error.issues[0].path.join('.');
    }

    // Log error for monitoring (in production, this would go to a logging service)
    // eslint-disable-next-line no-console
    console.error('[API Error]', {
      requestId,
      code: errorCode,
      statusCode,
      error: details,
      timestamp: errorResponse.error.timestamp,
    });

    return NextResponse.json(errorResponse, {
      status: statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Code': errorCode,
      },
    });
  }

  /**
   * Create a standardized success response
   */
  static createSuccessResponse<T>(
    data: T,
    message?: string,
    statusCode: number = STATUS_CODES.OK,
    requestId: string = crypto.randomUUID(),
  ): NextResponse<ApiSuccessResponse<T>> {
    const successResponse: ApiSuccessResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId,
    };

    return NextResponse.json(successResponse, {
      status: statusCode,
      headers: {
        'X-Request-ID': requestId,
      },
    });
  }

  /**
   * Map error types to error codes
   */
  private static mapErrorCode(error: unknown, statusCode: number): string {
    if (error instanceof ZodError) {
      return ERROR_CODES.VALIDATION_ERROR;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('unauthorized') || message.includes('auth')) {
        return ERROR_CODES.UNAUTHORIZED;
      }

      if (message.includes('forbidden')) {
        return ERROR_CODES.FORBIDDEN;
      }

      if (message.includes('not found')) {
        return ERROR_CODES.NOT_FOUND;
      }

      if (message.includes('already exists') || message.includes('duplicate')) {
        return ERROR_CODES.ALREADY_EXISTS;
      }

      if (message.includes('rate limit')) {
        return ERROR_CODES.RATE_LIMITED;
      }

      if (message.includes('database') || message.includes('sql')) {
        return ERROR_CODES.DATABASE_ERROR;
      }

      if (message.includes('network') || message.includes('fetch')) {
        return ERROR_CODES.NETWORK_ERROR;
      }
    }

    // Map by status code
    switch (statusCode) {
      case STATUS_CODES.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHORIZED;
      case STATUS_CODES.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN;
      case STATUS_CODES.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND;
      case STATUS_CODES.CONFLICT:
        return ERROR_CODES.CONFLICT;
      case STATUS_CODES.UNPROCESSABLE_ENTITY:
        return ERROR_CODES.VALIDATION_ERROR;
      case STATUS_CODES.TOO_MANY_REQUESTS:
        return ERROR_CODES.RATE_LIMITED;
      case STATUS_CODES.SERVICE_UNAVAILABLE:
        return ERROR_CODES.SERVICE_UNAVAILABLE;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Generate user-friendly error messages
   */
  private static getUserFriendlyMessage(error: unknown): string {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return `Validation error: ${firstIssue.message}`;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('unauthorized')) {
        return 'You are not authorized to perform this action';
      }

      if (message.includes('forbidden')) {
        return 'Access to this resource is forbidden';
      }

      if (message.includes('not found')) {
        return 'The requested resource was not found';
      }

      if (message.includes('already exists')) {
        return 'This resource already exists';
      }

      if (message.includes('rate limit')) {
        return 'Too many requests. Please try again later';
      }

      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your connection and try again';
      }

      // Return the original message if it's user-friendly
      if (error.message.length < 100 && !message.includes('error:')) {
        return error.message;
      }
    }

    return 'An unexpected error occurred. Please try again';
  }

  /**
   * Validate authentication and return user ID
   */
  static async validateAuth(): Promise<{ userId: string; requestId: string }> {
    const requestId = crypto.randomUUID();

    try {
      const { userId } = await auth();

      if (!userId) {
        throw new Error('Unauthorized');
      }

      return { userId, requestId };
    } catch {
      throw new Error('Authentication required');
    }
  }

  /**
   * Handle async operations with proper error catching
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage?: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (operationError) {
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      throw operationError;
    }
  }
}
