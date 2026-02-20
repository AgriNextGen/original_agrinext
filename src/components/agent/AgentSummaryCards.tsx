import { Card, CardContent } from '@/components/ui/card';
import { Users, Sprout, ClipboardList, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAgentDashboardStats } from '@/hooks/useAgentDashboard';
import { Skeleton } from '@/components/ui/skeleton';

const AgentSummaryCards = () => {
  const stats = useAgentDashboardStats();
  
  const cards = [
    {
      title: 'Farmers Assigned',
      value: stats.farmersAssigned,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Crops',
      value: stats.activeCrops,
      icon: Sprout,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tasks Today',
      value: `${stats.tasksCompleted}/${stats.tasksToday}`,
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Ready to Harvest',
      value: stats.cropsReadyToHarvest,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Pending Transport',
      value: stats.pendingTransportRequests,
      icon: Truck,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

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
