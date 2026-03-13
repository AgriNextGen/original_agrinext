import { Card, CardContent } from '@/components/ui/card';
import { Users, Sprout, ClipboardList, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAgentDashboardStats } from '@/hooks/useAgentDashboard';
import { useLanguage } from '@/hooks/useLanguage';
import { Skeleton } from '@/components/ui/skeleton';

const AgentSummaryCards = () => {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useAgentDashboardStats();

  const cards = [
    {
      title: t('agent.summary.farmersAssigned'),
      value: stats?.farmersAssigned ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('agent.summary.activeCrops'),
      value: stats?.activeCrops ?? 0,
      icon: Sprout,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('agent.summary.tasksToday'),
      value: `${stats?.tasksCompleted ?? 0}/${stats?.tasksToday ?? 0}`,
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: t('agent.summary.readyToHarvest'),
      value: stats?.cropsReadyToHarvest ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: t('agent.summary.pendingTransport'),
      value: stats?.pendingTransportRequests ?? 0,
      icon: Truck,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-full ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AgentSummaryCards;
