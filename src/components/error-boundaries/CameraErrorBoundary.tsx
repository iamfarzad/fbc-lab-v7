/**
 * Camera Error Boundary
 * Graceful degradation for camera errors
 * Continues session without camera if it fails
 */

"use client";

import React, { Component, ReactNode } from 'react';
import { AlertCircle, Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CameraErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  fallbackMode?: 'disabled' | 'retry' | 'hidden';
}

interface CameraErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class CameraErrorBoundary extends Component<
  CameraErrorBoundaryProps,
  CameraErrorBoundaryState
> {
  private maxRetries = 2;
  private retryDelay = 2000;

  constructor(props: CameraErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CameraErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('📷 Camera Error Boundary caught error:', error, errorInfo);
    
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
          errorBoundary: 'camera',
        },
      });
    }
  }

  handleReset = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      console.log(`📷 Retrying camera (attempt ${retryCount + 1}/${this.maxRetries})`);
      
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
      console.error('📷 Max retry attempts reached for camera');
    }
  };

  handleManualReset = () => {
    console.log('📷 Manual camera reset triggered');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
    this.props.onReset?.();
  };

  getCameraErrorMessage(error: Error | null): string {
    if (!error) return 'Camera error occurred';

    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied')) {
      return 'Camera permission was denied. Please allow camera access in your browser settings.';
    }
    
    if (message.includes('notfound') || message.includes('not found')) {
      return 'No camera device found. Please connect a camera and try again.';
    }
    
    if (message.includes('notreadable') || message.includes('in use')) {
      return 'Camera is already in use by another application. Please close other apps and try again.';
    }
    
    if (message.includes('overconstrained')) {
      return 'Camera does not support the required settings. Try a different camera.';
    }
    
    return error.message || 'Camera encountered an unexpected error.';
  }

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallbackMode = 'disabled' } = this.props;

    if (!hasError) {
      return children;
    }

    // Hidden fallback
    if (fallbackMode === 'hidden') {
      return null;
    }

    const errorMessage = this.getCameraErrorMessage(error);

    // Retry fallback
    if (fallbackMode === 'retry') {
      return (
        <div className="flex flex-col items-center justify-center p-4 space-y-3">
          <CameraOff className="h-10 w-10 text-destructive" />
          <div className="text-center space-y-1">
            <h4 className="text-sm font-semibold">Camera Unavailable</h4>
            <p className="text-xs text-muted-foreground max-w-xs">
              {errorMessage}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Attempt: {retryCount}/{this.maxRetries}
              </p>
            )}
          </div>
          <Button onClick={this.handleManualReset} size="sm" variant="outline">
            <Camera className="h-4 w-4 mr-2" />
            Retry Camera
          </Button>
        </div>
      );
    }

    // Disabled fallback - continue without camera
    return (
      <div className="space-y-3">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Camera Disabled</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              Continuing without camera. Other features remain available.
            </p>
            <Button onClick={this.handleManualReset} size="sm" variant="outline" className="mt-2">
              <Camera className="h-4 w-4 mr-2" />
              Retry Camera
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}

// HOC for wrapping components
export function withCameraErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<CameraErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <CameraErrorBoundary {...options}>
        <Component {...props} />
      </CameraErrorBoundary>
    );
  }
}
