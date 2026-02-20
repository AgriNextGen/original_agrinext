import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useTodaysTasks, 
  useAllCrops, 
  useAllTransportRequests,
  useAIVisitPrioritization,
  useAIClusterSummary,
  useAILogs
} from '@/hooks/useAgentDashboard';
import { 
  Sparkles, 
  Route, 
  BarChart3, 
  Loader2, 
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, parseISO } from 'date-fns';

const AIInsightsPanel = () => {
  const [visitPriority, setVisitPriority] = useState<string | null>(null);
  const [clusterSummary, setClusterSummary] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const { data: tasks } = useTodaysTasks();
  const { data: crops } = useAllCrops();
  const { data: transports } = useAllTransportRequests();
  const { data: aiLogs } = useAILogs();
  
  const visitPrioritization = useAIVisitPrioritization();
  const clusterSummaryMutation = useAIClusterSummary();

  const handlePrioritize = async () => {
    if (!tasks || tasks.length === 0) {
      toast.error('No tasks to prioritize');
      return;
    }
    
    try {
      const result = await visitPrioritization.mutateAsync(tasks);
      setVisitPriority(result);
      toast.success('AI prioritization complete');
    } catch (error) {
      toast.error('Failed to get AI suggestions');
    }
  };

  const handleClusterSummary = async () => {
    const clusterData = {
      totalFarmers: new Set(crops?.map(c => c.farmer_id) || []).size,
      totalCrops: crops?.length || 0,
      cropsByStatus: {
        growing: crops?.filter(c => c.status === 'growing').length || 0,
        one_week: crops?.filter(c => c.status === 'one_week').length || 0,
        ready: crops?.filter(c => c.status === 'ready').length || 0,
        harvested: crops?.filter(c => c.status === 'harvested').length || 0,
      },
      pendingTransports: transports?.filter(t => t.status === 'requested').length || 0,
      assignedTransports: transports?.filter(t => t.status === 'assigned').length || 0,
      topCrops: crops
        ?.reduce((acc: Record<string, number>, crop) => {
          acc[crop.crop_name] = (acc[crop.crop_name] || 0) + 1;
          return acc;
        }, {}) || {},
    };
    
    try {
      const result = await clusterSummaryMutation.mutateAsync(clusterData);
      setClusterSummary(result);
      toast.success('AI analysis complete');
    } catch (error) {
      toast.error('Failed to generate summary');
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Insights
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Powered by AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handlePrioritize}
            disabled={visitPrioritization.isPending}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {visitPrioritization.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Route className="h-4 w-4 mr-2" />
            )}
            Prioritize Today's Visits
          </Button>
          
          <Button 
            onClick={handleClusterSummary}
            disabled={clusterSummaryMutation.isPending}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {clusterSummaryMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            Generate Cluster Summary
          </Button>
        </div>

        {/* Visit Priority Results */}
        {visitPriority && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <Route className="h-4 w-4" />
              AI Suggested Visit Order
            </h4>
            <ScrollArea className="h-48">
              <div className="text-sm whitespace-pre-wrap text-gray-700">
                {visitPriority}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Cluster Summary Results */}
        {clusterSummary && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Cluster Analysis
            </h4>
            <ScrollArea className="h-48">
              <div className="text-sm whitespace-pre-wrap text-gray-700">
                {clusterSummary}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* AI History Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full text-muted-foreground"
        >
          <History className="h-4 w-4 mr-2" />
          Recent AI Insights
          {showHistory ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>

        {/* AI History */}
        {showHistory && aiLogs && aiLogs.length > 0 && (
          <div className="space-y-2">
            {aiLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-lg border text-sm">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs">
                    {log.log_type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2">
                  {log.output_text?.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsPanel;
