import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import DataState from '@/components/ui/DataState';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useReverseLoadOpportunities,
  useAcceptReverseLoad,
  useDeclineReverseLoad,
} from '@/hooks/useUnifiedLogistics';
import ReverseLoadCard from '@/components/logistics/ReverseLoadCard';

const ReverseLoads = () => {
  const { t } = useLanguage();
  const { data: candidates, isLoading, error } = useReverseLoadOpportunities();
  const acceptMutation = useAcceptReverseLoad();
  const declineMutation = useDeclineReverseLoad();
  const [actingOn, setActingOn] = useState<string | null>(null);

  const handleAccept = (id: string) => {
    setActingOn(id);
    acceptMutation.mutate(id, { onSettled: () => setActingOn(null) });
  };

  const handleDecline = (id: string) => {
    setActingOn(id);
    declineMutation.mutate(id, { onSettled: () => setActingOn(null) });
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.reverseLoads')}>
        <PageShell title={t('logistics.reverseLoadOpportunities')}>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('logistics.reverseLoads')}>
      <PageShell
        title={t('logistics.reverseLoadOpportunities')}
        subtitle={`${candidates?.length ?? 0} ${t('logistics.opportunitiesAvailable')}`}
      >
        <DataState
          empty={!candidates || candidates.length === 0}
          error={error instanceof Error ? error.message : null}
          emptyTitle={t('logistics.noReverseLoads')}
          emptyMessage={t('logistics.noReverseLoadsHint')}
          retry={() => window.location.reload()}
        >
          <div className="space-y-4">
            {(candidates ?? []).map((c) => (
              <ReverseLoadCard
                key={c.id}
                candidate={c}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isAccepting={actingOn === c.id && acceptMutation.isPending}
                isDeclining={actingOn === c.id && declineMutation.isPending}
              />
            ))}
          </div>
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
};

export default ReverseLoads;
