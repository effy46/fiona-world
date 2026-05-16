import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback: ReactNode;
};

type State = {
  failed: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(error: Error) {
    if (typeof window !== 'undefined') {
      (window as unknown as { __canvasError?: string }).__canvasError = `${error.name}: ${error.message}`;
    }
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Canvas failed', error, info);
    if (typeof window !== 'undefined') {
      (window as unknown as { __canvasError?: string }).__canvasError = `${error.name}: ${error.message}`;
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
