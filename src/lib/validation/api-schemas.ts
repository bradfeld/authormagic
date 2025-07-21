import { z } from 'zod';

// Common validation patterns
const isbnRegex =
  /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;
const urlRegex =
  /^https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w._~!$&'()*+,;=:@-]|%[0-9A-Fa-f]{2})*)*(?:\?(?:[\w._~!$&'()*+,;=:@/?-]|%[0-9A-Fa-f]{2})*)?(?:#(?:[\w._~!$&'()*+,;=:@/?-]|%[0-9A-Fa-f]{2})*)?$/;
const twitterUsernameRegex = /^[A-Za-z0-9_]{1,15}$/;
const githubUsernameRegex = /^[A-Za-z0-9]([A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

// Book-related schemas
export const BookSchema = z.object({
  title: z
    .string()
    .min(1, 'Book title is required')
    .max(500, 'Book title must be less than 500 characters')
    .trim(),

  authors: z
    .array(z.string().min(1, 'Author name cannot be empty'))
    .min(1, 'At least one author is required')
    .max(10, 'Maximum 10 authors allowed'),

  isbn: z
    .string()
    .regex(isbnRegex, 'Invalid ISBN format')
    .optional()
    .or(z.literal('')),

  subtitle: z.string().max(1000, 'Subtitle too long').optional(),
  publisher: z.string().max(200, 'Publisher name too long').optional(),
  published_date: z.string().optional(),
  categories: z.array(z.string()).max(20, 'Maximum 20 categories').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  page_count: z.number().int().positive().max(50000).optional(),
  language: z
    .string()
    .length(2, 'Language must be 2 character code')
    .optional(),
  print_type: z.string().max(50).optional(),
  binding: z.string().max(50).optional(),
  image: z.string().url('Invalid image URL').optional(),
  thumbnail: z.string().url('Invalid thumbnail URL').optional(),
});

export const BookCreateRequestSchema = z.object({
  book: BookSchema,
  allEditionData: z.array(BookSchema).optional(),
});

// Profile-related schemas
export const ProfileUpdateSchema = z.object({
  bio: z
    .string()
    .max(1000, 'Bio must be less than 1000 characters')
    .trim()
    .optional(),

  website_url: z
    .string()
    .max(500, 'Website URL too long')
    .refine(val => !val || val === '' || urlRegex.test(val), {
      message: 'Invalid website URL',
    })
    .optional()
    .or(z.literal(''))
    .or(z.null()),

  twitter_username: z
    .string()
    .refine(val => !val || val === '' || twitterUsernameRegex.test(val), {
      message: 'Invalid Twitter username',
    })
    .optional()
    .or(z.literal(''))
    .or(z.null()),

  linkedin_url: z
    .string()
    .max(500, 'LinkedIn URL too long')
    .refine(val => !val || val === '' || urlRegex.test(val), {
      message: 'Invalid LinkedIn URL',
    })
    .optional()
    .or(z.literal(''))
    .or(z.null()),

  facebook_url: z
    .string()
    .max(500, 'Facebook URL too long')
    .refine(val => !val || val === '' || urlRegex.test(val), {
      message: 'Invalid Facebook URL',
    })
    .optional()
    .or(z.literal(''))
    .or(z.null()),

  github_username: z
    .string()
    .refine(val => !val || val === '' || githubUsernameRegex.test(val), {
      message: 'Invalid GitHub username',
    })
    .optional()
    .or(z.literal(''))
    .or(z.null()),

  goodreads_url: z
    .string()
    .max(500, 'Goodreads URL too long')
    .refine(val => !val || val === '' || urlRegex.test(val), {
      message: 'Invalid Goodreads URL',
    })
    .optional()
    .or(z.literal(''))
    .or(z.null()),

  amazon_author_url: z
    .string()
    .max(500, 'Amazon Author URL too long')
    .refine(val => !val || val === '' || urlRegex.test(val), {
      message: 'Invalid Amazon Author URL',
    })
    .optional()
    .or(z.literal(''))
    .or(z.null()),
});

// Search and query schemas
export const BookSearchQuerySchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required for search')
    .max(500, 'Title too long')
    .trim(),

  author: z
    .string()
    .min(1, 'Author is required for search')
    .max(200, 'Author name too long')
    .trim(),

  validate: z.enum(['true', 'false']).optional(),
  filter_unverified: z.enum(['true', 'false']).optional(),
  min_confidence: z
    .string()
    .regex(/^0\.\d+$|^1\.0$/, 'Confidence must be between 0.0 and 1.0')
    .optional(),
});

export const ISBNSearchSchema = z.object({
  isbn: z
    .string()
    .regex(isbnRegex, 'Invalid ISBN format')
    .min(10, 'ISBN too short')
    .max(17, 'ISBN too long'),
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive integer')
    .transform(val => parseInt(val))
    .refine(val => val >= 1, 'Page must be at least 1')
    .optional()
    .default('1'),

  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive integer')
    .transform(val => parseInt(val))
    .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('20'),
});

// Request validation helpers
export const withPagination = <T extends z.ZodObject<any>>(schema: T) => {
  return schema.extend(PaginationSchema.shape);
};

// Middleware validation function
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const validData = schema.parse(params);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 10000); // Limit length
}

export function sanitizeObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item,
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Error message helpers
export function formatValidationError(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  const path =
    firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
  return `${path}${firstIssue.message}`;
}

export function getValidationErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
}> {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}
