import { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DataStateProps {
  loading?: boolean;
  empty?: boolean;
  error?: string | null;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  retry?: () => void;
  children: ReactNode;
}

const DataState = ({
  loading = false,
  empty = false,
  error,
  loadingLabel = 'Loading...',
  emptyTitle = 'No data available',
  emptyMessage,
  retry,
  children,
}: DataStateProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-6 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        <p className="text-sm">{loadingLabel}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 h-5 w-5 text-destructive" />
        <p className="mb-3 text-sm text-destructive">{error}</p>
        {retry ? (
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-6 text-center">
        <Inbox className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
        <p className="font-medium text-foreground">{emptyTitle}</p>
        {emptyMessage ? <p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p> : null}
      </div>
    );
  }

  return <>{children}</>;
};

export default DataState;
