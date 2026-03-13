import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Sprout, LandPlot, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllFarmers } from '@/hooks/useAdminDashboard';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminFarmers = () => {
  const { data: farmers, isLoading } = useAllFarmers();
  const [search, setSearch] = useState('');

  const filteredFarmers = farmers?.filter(f => 
    f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.village?.toLowerCase().includes(search.toLowerCase()) ||
    f.district?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title="Farmer Management">
      <PageShell
        title="Farmer Management"
        subtitle="View and manage all registered farmers"
        actions={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search farmers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>All Farmers ({filteredFarmers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredFarmers.length === 0 ? (
                <EmptyState icon={Inbox} title="No farmers found" />
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Land (acres)</TableHead>
                        <TableHead>Active Crops</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarmers.map((farmer) => (
                        <TableRow key={farmer.id}>
                          <TableCell className="font-medium">
                            {farmer.full_name || 'Unnamed'}
                          </TableCell>
                          <TableCell>{farmer.phone || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3" />
                              {farmer.village || farmer.district || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <LandPlot className="w-3 h-3" />
                              {farmer.totalLand?.toFixed(1) || '0'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <Sprout className="w-3 h-3" />
                              {farmer.cropCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(farmer.created_at).toLocaleDateString()}
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

export default AdminFarmers;
