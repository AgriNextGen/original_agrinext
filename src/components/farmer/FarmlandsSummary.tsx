import { useState } from 'react';
import { useFarmlands } from '@/hooks/useFarmerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LandPlot, MapPin, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FarmlandsSummary = () => {
  const { data: farmlands, isLoading } = useFarmlands();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const totalArea = farmlands?.reduce((sum, l) => sum + l.area, 0) || 0;
  const displayedFarmlands = farmlands?.slice(0, 4) || [];
  const topFarmlands = farmlands?.slice(0, 2) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <LandPlot className="h-5 w-5 text-primary" />
            My Farmlands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LandPlot className="h-5 w-5 text-primary" />
              My Farmlands
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {farmlands?.length || 0} plots • {totalArea.toFixed(1)} acres total
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/farmer/farmlands')}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {displayedFarmlands.length === 0 ? (
            <div className="text-center py-4">
              <LandPlot className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">No farmlands added yet</p>
              <Button 
                variant="outline" 
                className="mt-3" 
                size="sm"
                onClick={() => navigate('/farmer/farmlands')}
              >
                Add Your First Farmland
              </Button>
            </div>
          ) : (
            <>
              {/* Compact View - Top 2 farmlands */}
              <div className="space-y-2">
                {topFarmlands.map((land) => (
                  <div
                    key={land.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate('/farmer/farmlands')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                        <LandPlot className="h-3 w-3" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm truncate max-w-[120px]">{land.name}</h4>
                        {land.village && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-2 w-2" />
                            <span className="truncate max-w-[80px]">{land.village}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {land.area} {land.area_unit}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Expand trigger */}
              {displayedFarmlands.length > 2 && (
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-2 h-8 text-muted-foreground hover:text-foreground text-xs"
                  >
                    {isExpanded ? 'Show less' : `+${displayedFarmlands.length - 2} more plots`}
                    <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              )}

              {/* Expanded Details */}
              <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                <div className="space-y-2 pt-2">
                  {displayedFarmlands.slice(2).map((land) => (
                    <div
                      key={land.id}
                      className="bg-muted/30 border border-border/50 rounded-lg p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/farmer/farmlands')}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                          <LandPlot className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">{land.name}</h4>
                            <Badge variant="outline" className="text-xs px-1.5 py-0 ml-2">
                              {land.area} {land.area_unit}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            {land.soil_type && (
                              <span className="capitalize">{land.soil_type}</span>
                            )}
                            {land.village && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-2 w-2" />
                                <span className="truncate">{land.village}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {farmlands && farmlands.length > 4 && (
                    <Button 
                      variant="ghost" 
                      className="w-full h-8 text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => navigate('/farmer/farmlands')}
                    >
                      View all farmlands ({farmlands.length})
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default FarmlandsSummary;
