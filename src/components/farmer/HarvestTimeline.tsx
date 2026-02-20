import { useState } from 'react';
import { useCrops } from '@/hooks/useFarmerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Wheat, TrendingUp, ChevronDown } from 'lucide-react';
import { format, addDays, isWithinInterval } from 'date-fns';

const HarvestTimeline = () => {
  const { data: crops, isLoading } = useCrops();
  const [isExpanded, setIsExpanded] = useState(false);

  const today = new Date();
  const twoWeeksLater = addDays(today, 14);

  const upcomingHarvests = crops?.filter((crop) => {
    if (!crop.harvest_estimate || crop.status === 'harvested') return false;
    const harvestDate = new Date(crop.harvest_estimate);
    return isWithinInterval(harvestDate, { start: today, end: twoWeeksLater });
  }).sort((a, b) => {
    return new Date(a.harvest_estimate!).getTime() - new Date(b.harvest_estimate!).getTime();
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Harvests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Get the nearest harvest for compact view
  const nearestHarvest = upcomingHarvests[0];
  const nearestDaysUntil = nearestHarvest 
    ? Math.ceil((new Date(nearestHarvest.harvest_estimate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Harvests
                {upcomingHarvests.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {upcomingHarvests.length} in 14 days
                  </Badge>
                )}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Compact View - Always visible summary */}
          {!isExpanded && (
            <div className="space-y-2">
              {upcomingHarvests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No harvests in the next 2 weeks</p>
              ) : nearestHarvest ? (
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wheat className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{nearestHarvest.crop_name}</span>
                    <span className="text-sm text-muted-foreground">
                      • {format(new Date(nearestHarvest.harvest_estimate!), 'MMM d')}
                    </span>
                  </div>
                  <Badge className={
                    nearestDaysUntil! <= 3 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : nearestDaysUntil! <= 7 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-muted text-muted-foreground'
                  }>
                    {nearestDaysUntil === 0 ? 'Today' : nearestDaysUntil === 1 ? 'Tomorrow' : `${nearestDaysUntil} days`}
                  </Badge>
                </div>
              ) : null}
              {upcomingHarvests.length > 1 && (
                <p className="text-xs text-muted-foreground">+{upcomingHarvests.length - 1} more harvests coming up</p>
              )}
            </div>
          )}

          {/* Expanded View */}
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            {upcomingHarvests.length === 0 ? (
              <div className="text-center py-6">
                <Wheat className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No harvests in the next 2 weeks</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {upcomingHarvests.map((crop, index) => {
                  const harvestDate = new Date(crop.harvest_estimate!);
                  const daysUntil = Math.ceil((harvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={crop.id}
                      className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      {/* Timeline dot */}
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${
                          daysUntil <= 3 ? 'bg-emerald-500' : daysUntil <= 7 ? 'bg-amber-500' : 'bg-muted-foreground'
                        }`} />
                        {index < upcomingHarvests.length - 1 && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-border" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Wheat className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground truncate">{crop.crop_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{format(harvestDate, 'MMM d, yyyy')}</span>
                          {crop.farmland && (
                            <>
                              <span>•</span>
                              <span className="truncate">{crop.farmland.village || crop.farmland.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Days badge */}
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        daysUntil <= 3 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : daysUntil <= 7 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </div>

                      {/* Action hint */}
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Monitor price</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default HarvestTimeline;
