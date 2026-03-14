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
import { useVehicles } from '@/hooks/useLogisticsDashboard';
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
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';

const AvailableLoads = () => {
  const { t } = useLanguage();
  const { data: vehicles } = useVehicles();
  const acceptLoad = useAcceptLoadSecure();
  const { data: pages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTransportRequestsInfinite({ status: 'requested' });
  const allLoads = pages ? pages.pages.flatMap((p: any) => p.items || []) : [];
  
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
              toast.error(t('errors.loadAlreadyAccepted'));
            } else {
              toast.error(t('errors.acceptLoadFailed'));
            }
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.availableLoads')}>
        <PageShell title={t('logistics.availableLoads')}>
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('logistics.availableLoads')}>
      <PageShell
        title={t('logistics.availableLoads')}
        subtitle={`${filteredLoads?.length || 0} ${t('logistics.loadsWaiting')}`}
      >

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('logistics.searchLoads')}
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
            {t('logistics.loadRequests')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataState
            empty={!filteredLoads || filteredLoads.length === 0}
            emptyTitle={t('logistics.noLoadsFound')}
            emptyMessage={t('logistics.checkBackLater')}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('logistics.farmer')}</TableHead>
                    <TableHead>{t('logistics.crop')}</TableHead>
                    <TableHead>{t('logistics.quantity')}</TableHead>
                    <TableHead>{t('logistics.pickupLocation')}</TableHead>
                    <TableHead>{t('logistics.preferredDate')}</TableHead>
                    <TableHead className="text-right">{t('logistics.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.map((load) => (
                    <TableRow key={load.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{load.farmer?.full_name || t('common.unknown')}</p>
                            <p className="text-xs text-muted-foreground">{load.farmer?.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{load.crop?.crop_name || t('common.notAvailable')}</p>
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
                          <span className="text-muted-foreground">{t('common.flexible')}</span>
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
                          {t('common.accept')}
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
            <DialogTitle>{t('logistics.acceptLoad')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              {t('logistics.aboutToAccept')}
            </p>
            
            {vehicles && vehicles.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('logistics.assignVehicle')}</label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('logistics.selectVehicle')} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration_number || 'No Reg.'} - {vehicle.vehicle_type ?? 'Vehicle'} ({vehicle.capacity_kg ?? 0} kg)
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
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmAccept} disabled={acceptLoad.isPending}>
              {acceptLoad.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {t('logistics.accepting')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {t('logistics.confirmAccept')}
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
