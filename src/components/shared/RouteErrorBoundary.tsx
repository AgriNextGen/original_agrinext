import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { kn } from '@/i18n/kn';
import { STORAGE_KEYS } from '@/lib/constants';

interface Props {
  children: React.ReactNode;
  dashboardPath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function getTranslations() {
  const stored =
    localStorage.getItem(STORAGE_KEYS.LANGUAGE) ??
    localStorage.getItem(STORAGE_KEYS.PUBLIC_LANGUAGE);
  const lang = stored === 'kn' ? kn : en;
  return lang.errorBoundary ?? en.errorBoundary;
}

class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[RouteErrorBoundary]', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = this.props.dashboardPath || '/';
  };

  render() {
    if (this.state.hasError) {
      const strings = getTranslations();

      return (
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertTriangle aria-hidden="true" className="h-12 w-12 text-amber-500 mx-auto mb-4" />
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
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {strings.reload}
              </Button>
              <Button onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                {strings.dashboard}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
