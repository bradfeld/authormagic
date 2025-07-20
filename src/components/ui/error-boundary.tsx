'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import React, { Component, ReactNode } from 'react';

import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    // eslint-disable-next-line no-console
    console.error('[Error Boundary]', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render different error UIs based on level
      switch (this.props.level) {
        case 'critical':
          return (
            <CriticalErrorFallback
              onRetry={this.handleRetry}
              onGoHome={this.handleGoHome}
            />
          );
        case 'page':
          return (
            <PageErrorFallback
              onRetry={this.handleRetry}
              onGoHome={this.handleGoHome}
            />
          );
        default:
          return <ComponentErrorFallback onRetry={this.handleRetry} />;
      }
    }

    return this.props.children;
  }
}

// Critical error fallback (for app-wide failures)
function CriticalErrorFallback({
  onRetry,
  onGoHome,
}: {
  onRetry: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            We encountered an unexpected error. Please try refreshing the page
            or contact support if the problem persists.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={onGoHome} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Page-level error fallback
function PageErrorFallback({
  onRetry,
  onGoHome,
}: {
  onRetry: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <CardTitle className="text-gray-900">Page Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            This page encountered an error while loading. Please try again.
          </p>
          <div className="flex gap-2">
            <Button onClick={onRetry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={onGoHome} className="flex-1">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component-level error fallback
function ComponentErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 my-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-yellow-800 font-medium">Component Error</p>
          <p className="text-yellow-700 text-sm mt-1">
            This component failed to load. You can try refreshing it.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
      </div>
    </div>
  );
}

// Hook for error reporting
export function useErrorHandler() {
  const reportError = (error: Error, context?: string) => {
    // eslint-disable-next-line no-console
    console.error('[Error Reported]', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    });

    // In production, this would send to error monitoring service
    // Example: Sentry.captureException(error, { extra: { context } });
  };

  return { reportError };
}

// API Error Display Component
export function ApiErrorDisplay({
  error,
  onRetry,
}: {
  error: { message: string; code?: string };
  onRetry?: () => void;
}) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-800 font-medium">
            {error.code ? `Error ${error.code}` : 'API Error'}
          </p>
          <p className="text-red-700 text-sm mt-1">{error.message}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

// Loading Error Component (for async operations)
export function LoadingError({
  message = 'Failed to load data',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <AlertTriangle className="w-8 h-8 text-gray-400 mb-3" />
      <p className="text-gray-600 mb-4 text-center">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
