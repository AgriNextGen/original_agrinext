import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, MapPin, Calendar, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllTransportRequests, useUpdateTransportStatus } from '@/hooks/useAdminDashboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminTransport = () => {
  const { data: requests, isLoading } = useAllTransportRequests();
  const updateStatus = useUpdateTransportStatus();

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'accepted':
      case 'assigned': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'open':
      case 'requested': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <DashboardLayout title="Transport Management">
      <PageShell
        title="Transport Management"
        subtitle="Manage all transport requests across the ecosystem"
      >
        <Card>
          <CardHeader>
            <CardTitle>All Transport Requests ({requests?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (!requests || requests.length === 0) ? (
                <EmptyState icon={Inbox} title="No transport requests found" />
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Crop</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Pickup</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Transporter</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">
                            {req.farmer?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{req.crop?.crop_name || '-'}</TableCell>
                          <TableCell>
                            {req.quantity} {req.quantity_unit || 'quintals'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3" />
                              {req.pickup_village || req.pickup_location || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {req.preferred_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {new Date(req.preferred_date).toLocaleDateString()}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {req.transporter?.name || (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColor(req.status)}>
                              {req.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={req.status}
                              onValueChange={(value) => handleStatusChange(req.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="requested">Requested</SelectItem>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default AdminTransport;
