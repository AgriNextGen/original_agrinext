import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAllCrops } from '@/hooks/useAgentDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Wheat, Calendar, MapPin } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

const CropsNearHarvest = () => {
  const { data: crops, isLoading } = useAllCrops();

  const today = new Date();
  const nearHarvestCrops = crops
    ?.filter((crop) => {
      if (!crop.harvest_estimate || crop.status === 'harvested') return false;
      const harvestDate = parseISO(crop.harvest_estimate);
      const daysToHarvest = differenceInDays(harvestDate, today);
      return daysToHarvest >= 0 && daysToHarvest <= 14;
    })
    .map((crop) => ({
      ...crop,
      daysToHarvest: differenceInDays(parseISO(crop.harvest_estimate!), today),
    }))
    .sort((a, b) => a.daysToHarvest - b.daysToHarvest)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            Crops Near Harvest
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wheat className="h-5 w-5 text-amber-600" />
          Crops Near Harvest
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!nearHarvestCrops || nearHarvestCrops.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wheat className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No crops near harvest</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearHarvestCrops.map((crop) => (
              <div
                key={crop.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{crop.crop_name}</span>
                    <Badge
                      variant="outline"
                      className={
                        crop.status === 'ready'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : crop.status === 'one_week'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {crop.status === 'ready' ? 'Ready' : crop.status === 'one_week' ? '1 Week' : 'Growing'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{(crop as any).farmer?.full_name || 'Unknown'}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {(crop as any).farmer?.village || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      crop.daysToHarvest <= 3 ? 'text-red-600' : crop.daysToHarvest <= 7 ? 'text-amber-600' : 'text-green-600'
                    }`}
                  >
                    {crop.daysToHarvest === 0 ? 'Today' : `${crop.daysToHarvest}d`}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    to harvest
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CropsNearHarvest;
