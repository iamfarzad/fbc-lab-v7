"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error to analytics service if available
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Send error to analytics/logging service
    if (typeof window !== 'undefined' && 'fetch' in window) {
      fetch('/api/analytics/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId: this.state.errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {
        // Silently fail if analytics service is unavailable
      });
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (
      hasError &&
      ((resetOnPropsChange && prevProps !== this.props) ||
        (resetKeys && resetKeys.length > 0 && this.props.resetKeys !== prevProps.resetKeys))
    ) {
      // Clear any existing timeout
      if (this.resetTimeoutId) {
        clearTimeout(this.resetTimeoutId);
      }

      // Set a new timeout to reset the error boundary
      this.resetTimeoutId = window.setTimeout(() => {
        this.handleReset();
      }, 300);
    }
  }

  componentWillUnmount() {
    // Clean up timeout on unmount
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-4">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>

            {/* Error Title */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Something went wrong
              </h3>
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="space-y-2 text-left">
                <details className="bg-muted/50 rounded-lg p-3">
                  <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Error ID:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded break-all">
                        {errorId}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Message:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded break-all">
                        {error.message}
                      </code>
                    </div>
                    {errorInfo && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Component Stack:</p>
                        <pre className="text-xs bg-background px-2 py-1 rounded overflow-x-auto whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReload}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
    
    // Log error to analytics service
    if (typeof window !== 'undefined' && 'fetch' in window) {
      const errorId = `hook_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      fetch('/api/analytics/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          source: 'useErrorHandler'
        })
      }).catch(() => {
        // Silently fail if analytics service is unavailable
      });
    }
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { resetError, captureError };
}

// Component to throw errors when needed
export function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Component Error
          </h3>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred in this component.'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetError}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
