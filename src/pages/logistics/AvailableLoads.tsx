import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Package, MapPin, Calendar, Search, Check, X, User, Loader2 } from 'lucide-react';
import { useAvailableLoads, useVehicles } from '@/hooks/useLogisticsDashboard';
import { useTransportRequestsInfinite } from '@/hooks/useTransportRequests';
import { useAcceptLoadSecure } from '@/hooks/useTrips';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/error-utils';
import { toast } from 'sonner';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';

const AvailableLoads = () => {
  const { data: loads, isLoading } = useAvailableLoads();
  const { t } = useLanguage();
  const { data: vehicles } = useVehicles();
  const acceptLoad = useAcceptLoadSecure();
  const { data: pages, isLoading: infiniteLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTransportRequestsInfinite();
  const allLoads = pages ? pages.pages.flatMap((p: any) => p.items || []) : (loads || []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoad, setSelectedLoad] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredLoads = allLoads?.filter(load => {
    const query = searchQuery.toLowerCase();
    return (
      load.farmer?.full_name?.toLowerCase().includes(query) ||
      load.crop?.crop_name?.toLowerCase().includes(query) ||
      load.pickup_village?.toLowerCase().includes(query) ||
      load.pickup_location?.toLowerCase().includes(query)
    );
  });

  const handleAcceptClick = (loadId: string) => {
    setSelectedLoad(loadId);
    setIsDialogOpen(true);
  };

  const handleConfirmAccept = () => {
    if (selectedLoad) {
      acceptLoad.mutate(
        { transportRequestId: selectedLoad, vehicleId: selectedVehicle || undefined },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setSelectedLoad(null);
            setSelectedVehicle('');
          },
          onError: (error) => {
            const message = getErrorMessage(error);
            // Check for "already assigned" errors
            if (message.toLowerCase().includes('already') || message.includes('ALREADY_ASSIGNED')) {
              toast.error('This load has already been accepted by another transporter');
            } else {
              toast.error(`Failed to accept load: ${message}`);
            }
          },
        }
      );
    }
  };

  if (isLoading) {
    return <DashboardLayout title="Available Loads"><DataState loading><></></DataState></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Available Loads">
      <PageShell
        title="Available Loads"
        subtitle={`${filteredLoads?.length || 0} loads waiting for pickup`}
      >

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by farmer, crop, or village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            Load Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataState
            empty={!filteredLoads || filteredLoads.length === 0}
            emptyTitle="No available loads found"
            emptyMessage="Check back later for new transport requests."
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Pickup Location</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.map((load) => (
                    <TableRow key={load.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{load.farmer?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{load.farmer?.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{load.crop?.crop_name || 'N/A'}</p>
                          {load.crop?.variety && (
                            <p className="text-xs text-muted-foreground">{load.crop.variety}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {load.quantity} {load.quantity_unit || 'quintals'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{load.pickup_village || load.pickup_location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {load.preferred_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{format(parseISO(load.preferred_date), 'MMM d, yyyy')}</span>
                            {load.preferred_time && (
                              <span className="text-muted-foreground">@ {load.preferred_time}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Flexible</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptClick(load.id)}
                          disabled={acceptLoad.isPending}
                        >
                          {acceptLoad.isPending && selectedLoad === load.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Accept
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-center">
              {hasNextPage ? (
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground">{t('common.noMoreItems')}</div>
              )}
            </div>
          </DataState>
        </CardContent>
      </Card>

      {/* Accept Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Load</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              You are about to accept this load. Once accepted, it will appear in your Active Trips.
            </p>
            
            {vehicles && vehicles.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Vehicle (Optional)</label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.number_plate} - {vehicle.vehicle_type} ({vehicle.capacity} tons)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={acceptLoad.isPending}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleConfirmAccept} disabled={acceptLoad.isPending}>
              {acceptLoad.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Confirm Accept
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageShell>
    </DashboardLayout>
  );
};

export default AvailableLoads;
