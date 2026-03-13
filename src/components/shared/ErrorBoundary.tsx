import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { kn } from '@/i18n/kn';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function getTranslations() {
  const stored = localStorage.getItem('agrinext-language');
  const lang = stored === 'kn' ? kn : en;
  return lang.errorBoundary ?? en.errorBoundary;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const strings = getTranslations();

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertTriangle aria-hidden="true" className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {strings.title}
            </h2>
            <p className="text-muted-foreground mb-6">
              {strings.description}
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs text-destructive bg-destructive/10 p-3 rounded-lg mb-4 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReload}>
              {strings.reload}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
