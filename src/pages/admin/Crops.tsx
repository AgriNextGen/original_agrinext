import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Calendar, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllCrops } from '@/hooks/useAdminDashboard';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminCrops = () => {
  const { data: crops, isLoading } = useAllCrops();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCrops = crops?.filter(c => {
    const matchesSearch = 
      c.crop_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.farmer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.farmer?.village?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const statusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'one_week': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'growing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'harvested': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      default: return '';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'ready': return 'Harvest Ready';
      case 'one_week': return '1 Week Away';
      case 'growing': return 'Growing';
      case 'harvested': return 'Harvested';
      default: return status;
    }
  };

  return (
    <DashboardLayout title="Crop Monitoring">
      <PageShell
        title="Crop Monitoring"
        subtitle="Complete crop ecosystem overview"
        actions={
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ready">Harvest Ready</SelectItem>
                <SelectItem value="one_week">1 Week Away</SelectItem>
                <SelectItem value="growing">Growing</SelectItem>
                <SelectItem value="harvested">Harvested</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search crops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>All Crops ({filteredCrops.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredCrops.length === 0 ? (
              <EmptyState icon={Inbox} title="No crops found" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Harvest Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCrops.map((crop) => (
                      <TableRow key={crop.id}>
                        <TableCell className="font-medium">
                          <div>
                            {crop.crop_name}
                            {crop.variety && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({crop.variety})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{crop.farmer?.full_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            {crop.farmer?.village || crop.land?.village || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColor(crop.status)}>
                            {statusLabel(crop.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {crop.estimated_quantity} {crop.quantity_unit || 'quintals'}
                        </TableCell>
                        <TableCell>
                          {crop.harvest_estimate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              {new Date(crop.harvest_estimate).toLocaleDateString()}
                            </div>
                          ) : '-'}
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

export default AdminCrops;
