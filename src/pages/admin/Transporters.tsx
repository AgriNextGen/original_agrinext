import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Search, MapPin, Package, CheckCircle } from 'lucide-react';
import { useAllTransporters } from '@/hooks/useAdminDashboard';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminTransporters = () => {
  const { data: transporters, isLoading } = useAllTransporters();
  const [search, setSearch] = useState('');

  const filteredTransporters = transporters?.filter(t => 
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.operating_district?.toLowerCase().includes(search.toLowerCase()) ||
    t.operating_village?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title="Transporter Management">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              Transporter Management
            </h1>
            <p className="text-muted-foreground">View and manage logistics partners</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transporters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Transporters ({filteredTransporters.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Operating Area</TableHead>
                      <TableHead>Vehicles</TableHead>
                      <TableHead>Active Trips</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransporters.map((transporter) => (
                      <TableRow key={transporter.id}>
                        <TableCell className="font-medium">
                          {transporter.name}
                        </TableCell>
                        <TableCell>{transporter.phone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            {transporter.operating_district || transporter.operating_village || 'All'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Truck className="w-3 h-3 mr-1" />
                            {transporter.vehicleCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transporter.activeTrips > 0 ? 'default' : 'outline'}>
                            <Package className="w-3 h-3 mr-1" />
                            {transporter.activeTrips}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            {transporter.completedTrips}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTransporters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transporters found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminTransporters;
