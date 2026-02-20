import { useState } from 'react';
import { useTransportRequests } from '@/hooks/useFarmerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Truck, MapPin, Calendar, Package, ChevronRight, Plus, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
  requested: { label: 'Requested', color: 'bg-blue-100 text-blue-800', step: 1 },
  assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800', step: 2 },
  en_route: { label: 'En Route', color: 'bg-amber-100 text-amber-800', step: 3 },
  picked_up: { label: 'Picked Up', color: 'bg-emerald-100 text-emerald-800', step: 4 },
  delivered: { label: 'Delivered', color: 'bg-primary/10 text-primary', step: 5 },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive', step: 0 },
};

const TransportSection = () => {
  const { data: requests, isLoading } = useTransportRequests();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeRequests = requests?.filter(r => 
    !['delivered', 'cancelled'].includes(r.status)
  ).slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Transport Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Get the most recent/important request for compact view
  const topRequest = activeRequests[0];

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-primary" />
                Transport & Pickup
                {activeRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeRequests.length} active
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/farmer/transport');
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Compact View - Always visible summary */}
          {!isExpanded && (
            <div className="space-y-2">
              {activeRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active transport requests</p>
              ) : topRequest ? (
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{topRequest.crop?.crop_name || 'Crop'}</span>
                    <span className="text-sm text-muted-foreground">
                      • {topRequest.quantity} {topRequest.quantity_unit}
                    </span>
                  </div>
                  <Badge className={statusConfig[topRequest.status]?.color || 'bg-muted'}>
                    {statusConfig[topRequest.status]?.label || topRequest.status}
                  </Badge>
                </div>
              ) : null}
              {activeRequests.length > 1 && (
                <p className="text-xs text-muted-foreground">+{activeRequests.length - 1} more requests</p>
              )}
            </div>
          )}

          {/* Expanded View */}
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            {activeRequests.length === 0 ? (
              <div className="text-center py-6">
                <Truck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No active transport requests</p>
                <Button variant="outline" className="mt-4" size="sm" onClick={() => navigate('/farmer/transport')}>
                  Request Transport
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {activeRequests.map((request) => {
                  const status = statusConfig[request.status];
                  const totalSteps = 5;
                  const progress = (status.step / totalSteps) * 100;

                  return (
                    <div
                      key={request.id}
                      className="bg-muted/30 border border-border/50 rounded-xl p-4 hover:bg-muted/50 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">
                            {request.crop?.crop_name || 'Crop'}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            • {request.quantity} {request.quantity_unit}
                          </span>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>

                      {/* Progress bar */}
                      {status.step > 0 && (
                        <div className="mb-3">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>Requested</span>
                            <span>Assigned</span>
                            <span>En Route</span>
                            <span>Picked Up</span>
                            <span>Delivered</span>
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{request.pickup_village || request.pickup_location}</span>
                        </div>
                        {request.preferred_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(new Date(request.preferred_date), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* View all link */}
                {requests && requests.length > 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/farmer/transport')}
                  >
                    View all requests
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default TransportSection;
