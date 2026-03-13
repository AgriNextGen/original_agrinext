import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { useAllTransportRequests } from '@/hooks/useAgentDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, 
  MapPin, 
  Calendar,
  Package,
  Search,
  Info,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

const statusColors: Record<string, string> = {
  open: 'bg-gray-100 text-gray-800',
  requested: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const AgentTransport = () => {
  const { data: requests, isLoading } = useAllTransportRequests();
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = requests?.filter((req) => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = 
      (req as any).farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.pickup_village?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req as any).crop?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && (searchQuery === '' || matchesSearch);
  });

  return (
    <DashboardLayout title="Transport">
      <PageHeader title="Transport Requests" subtitle="View transport and pickup requests">
      <div className="space-y-6">

        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          <span>Transport status is managed by the logistics team. This view is read-only.</span>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by farmer, village, or crop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', 'open', 'requested', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={Truck}
                          title={'No transport requests found'}
                          description={'No transport requests match the current filters.'}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests?.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {(req as any).farmer?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {(req as any).crop ? (
                            <Badge variant="outline" className="bg-green-50">
                              {(req as any).crop.crop_name}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {req.quantity} {req.quantity_unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {req.pickup_village || req.pickup_location}
                          </span>
                        </TableCell>
                        <TableCell>
                          {req.preferred_date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(req.preferred_date), 'MMM d')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[req.status]}>
                            {req.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageHeader>
    </DashboardLayout>
  );
};

export default AgentTransport;
