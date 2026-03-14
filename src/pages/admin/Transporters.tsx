import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Search, MapPin, Package, CheckCircle, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllTransporters } from '@/hooks/useAdminDashboard';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminTransporters = () => {
  const { t } = useLanguage();
  const { data: transporters, isLoading } = useAllTransporters();
  const [search, setSearch] = useState('');

  const filteredTransporters = transporters?.filter(tp => 
    tp.name?.toLowerCase().includes(search.toLowerCase()) ||
    tp.operating_district?.toLowerCase().includes(search.toLowerCase()) ||
    tp.operating_village?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title={t('admin.transporters.title')}>
      <PageShell
        title={t('admin.transporters.title')}
        subtitle={t('admin.transporters.subtitle')}
        actions={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.transporters.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.transporters.allTransporters')} ({filteredTransporters.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTransporters.length === 0 ? (
                <EmptyState icon={Inbox} title={t('admin.transporters.noTransporters')} />
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.transporters.name')}</TableHead>
                        <TableHead>{t('admin.transporters.phone')}</TableHead>
                        <TableHead>{t('admin.transporters.operatingArea')}</TableHead>
                        <TableHead>{t('admin.transporters.vehicles')}</TableHead>
                        <TableHead>{t('admin.transporters.activeTrips')}</TableHead>
                        <TableHead>{t('admin.transporters.completed')}</TableHead>
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

export default AdminTransporters;
