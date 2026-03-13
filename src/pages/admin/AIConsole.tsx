import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles,
  RefreshCw,
  FileText,
  Clock,
  Users,
  Sprout,
  Truck,
  Package
} from 'lucide-react';
import KpiCard from '@/components/dashboard/KpiCard';
import { useAdminDashboardStats } from '@/hooks/useAdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  type: 'cluster_health' | 'supply_demand' | 'price_anomaly' | 'efficiency_advisor';
}

const aiModules: AIModule[] = [
  {
    id: 'cluster_health',
    title: 'Cluster Health Intelligence',
    description: 'Comprehensive ecosystem analysis including hotspots, bottlenecks, and risk factors',
    icon: Activity,
    gradient: 'from-purple-600 to-indigo-600',
    type: 'cluster_health',
  },
  {
    id: 'supply_demand',
    title: 'Supply-Demand Forecast',
    description: '7-day prediction of supply vs demand with shortage/surplus alerts',
    icon: TrendingUp,
    gradient: 'from-blue-600 to-cyan-600',
    type: 'supply_demand',
  },
  {
    id: 'price_anomaly',
    title: 'Price Anomaly Detection',
    description: 'Detect price irregularities, manipulation risks, and market anomalies',
    icon: AlertTriangle,
    gradient: 'from-amber-600 to-orange-600',
    type: 'price_anomaly',
  },
  {
    id: 'efficiency_advisor',
    title: 'Operational Efficiency',
    description: 'Agent productivity, transport utilization, and process optimization',
    icon: Sparkles,
    gradient: 'from-emerald-600 to-teal-600',
    type: 'efficiency_advisor',
  },
];

const AIConsole = () => {
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { text: string; timestamp: string }>>({});

  const handleRunAnalysis = async (module: AIModule) => {
    setLoading(module.id);
    
    try {
      const prompt = `Perform a ${module.type} analysis for an agricultural supply chain platform with these stats: totalFarmers=${stats?.totalFarmers || 0}, totalBuyers=${stats?.totalBuyers || 0}, activeTransporters=${stats?.activeTransporters || 0}, totalCrops=${stats?.totalCrops || 0}, harvestReady=${stats?.harvestReady || 0}, oneWeekAway=${stats?.oneWeekAway || 0}, pendingTransport=${stats?.pendingTransport || 0}, activeTransport=${stats?.activeTransport || 0}, pendingOrders=${stats?.pendingOrders || 0}, totalOrders=${stats?.newOrdersToday || 0}. Give actionable insights in 3-5 bullet points.`;

      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: { prompt, context: 'admin_analysis' },
      });

      if (error) throw error;

      setResults(prev => ({
        ...prev,
        [module.id]: {
          text: data?.response || data?.text || 'No analysis generated.',
          timestamp: new Date().toLocaleString(),
        },
      }));
      
      toast.success(`${module.title} analysis complete!`);
    } catch (error) {
      if (import.meta.env.DEV) console.error('AI error:', error);
      toast.error('Failed to generate AI analysis');
    } finally {
      setLoading(null);
    }
  };

  return (
    <DashboardLayout title="AI Command Console">
      <PageShell
        title="AI Command Console"
        subtitle="Generate AI-powered analytics and insights for the entire Agri Mitra ecosystem"
      >
        {/* AI Modules Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {aiModules.map((module) => (
            <Card key={module.id} className="overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${module.gradient} text-white`}>
                <CardTitle className="flex items-center gap-2">
                  <module.icon className="w-5 h-5" />
                  {module.title}
                </CardTitle>
                <CardDescription className="text-white/80">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button
                  onClick={() => handleRunAnalysis(module)}
                  disabled={loading === module.id || statsLoading}
                  className={`w-full bg-gradient-to-r ${module.gradient} hover:opacity-90`}
                >
                  {loading === module.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>

                {results[module.id] && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Generated: {results[module.id].timestamp}
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                      {results[module.id].text}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats for Context */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Current Ecosystem Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Farmers" value={stats?.totalFarmers || 0} icon={Users} priority="primary" />
                <KpiCard label="Harvest Ready" value={stats?.harvestReady || 0} icon={Sprout} priority="success" />
                <KpiCard label="Pending Transport" value={stats?.pendingTransport || 0} icon={Truck} priority="warning" />
                <KpiCard label="Pending Orders" value={stats?.pendingOrders || 0} icon={Package} priority="info" />
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default AIConsole;
