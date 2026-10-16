import React from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('组件渲染错误', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full min-h-[200px] flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/60 backdrop-blur-sm">
          <div className="text-pink-500 text-sm">组件加载失败</div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-1.5 rounded-full bg-pink-400 text-white text-xs hover:bg-pink-500 transition-colors"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
