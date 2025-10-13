/**
 * Voice Error Boundary
 * Graceful degradation for voice session errors
 * Falls back to text-only mode on voice failures
 */

"use client";

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface VoiceErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  fallbackMode?: 'text-only' | 'retry' | 'hidden';
}

interface VoiceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class VoiceErrorBoundary extends Component<
  VoiceErrorBoundaryProps,
  VoiceErrorBoundaryState
> {
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: VoiceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<VoiceErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🎤 Voice Error Boundary caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: 'voice',
        },
      });
    }
  }

  handleReset = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      console.log(`🎤 Retrying voice session (attempt ${retryCount + 1}/${this.maxRetries})`);
      
      // Exponential backoff
      const delay = this.retryDelay * Math.pow(2, retryCount);
      
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: retryCount + 1,
        });

        this.props.onReset?.();
      }, delay);
    } else {
      console.error('🎤 Max retry attempts reached, staying in error state');
      this.setState({ retryCount: 0 }); // Reset for manual retry
    }
  };

  handleManualReset = () => {
    console.log('🎤 Manual reset triggered');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
    this.props.onReset?.();
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallbackMode = 'text-only' } = this.props;

    if (!hasError) {
      return children;
    }

    // Hidden fallback - suppress error UI
    if (fallbackMode === 'hidden') {
      return null;
    }

    // Retry fallback - show retry UI
    if (fallbackMode === 'retry') {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Voice Session Error</h3>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'An error occurred with the voice session'}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Retry attempt: {retryCount}/{this.maxRetries}
              </p>
            )}
          </div>
          <Button onClick={this.handleManualReset} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Voice Session
          </Button>
        </div>
      );
    }

    // Text-only fallback - degrade gracefully
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Voice Mode Unavailable</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              {error?.message || 'Voice functionality encountered an error.'}
            </p>
            <p className="text-sm font-medium">
              Continuing in text-only mode. Voice features are temporarily disabled.
            </p>
            <div className="flex gap-2 mt-2">
              <Button onClick={this.handleManualReset} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Voice
              </Button>
            </div>
          </AlertDescription>
        </Alert>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }
}

// HOC for wrapping components
export function withVoiceErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<VoiceErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <VoiceErrorBoundary {...options}>
        <Component {...props} />
      </VoiceErrorBoundary>
    );
  }
}
