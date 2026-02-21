import { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

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
  loadingLabel = undefined,
  emptyTitle = undefined,
  emptyMessage,
  retry,
  children,
}: DataStateProps) => {
  const { t } = useLanguage();

  const resolvedLoadingLabel = loadingLabel ?? t('common.loading');
  const resolvedEmptyTitle = emptyTitle ?? t('common.noData');

  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-6 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        <p className="text-sm">{resolvedLoadingLabel}</p>
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
            {t('common.retry')}
          </Button>
        ) : null}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-6 text-center">
        <Inbox className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
        <p className="font-medium text-foreground">{resolvedEmptyTitle}</p>
        {emptyMessage ? <p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p> : null}
      </div>
    );
  }

  return <>{children}</>;
};

export default DataState;
