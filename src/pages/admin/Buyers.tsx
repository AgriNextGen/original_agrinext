import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Building, Package, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllBuyers } from '@/hooks/useAdminDashboard';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminBuyers = () => {
  const { data: buyers, isLoading } = useAllBuyers();
  const [search, setSearch] = useState('');

  const filteredBuyers = buyers?.filter(b => 
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.district?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const buyerTypeLabel = (type: string) => {
    switch (type) {
      case 'retail': return 'Retail';
      case 'wholesale': return 'Wholesale';
      case 'restaurant': return 'Restaurant';
      case 'export': return 'Export';
      case 'processor': return 'Food Processor';
      default: return type;
    }
  };

  return (
    <DashboardLayout title="Buyer Management">
      <PageShell
        title="Buyer Management"
        subtitle="View and manage marketplace buyers"
        actions={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search buyers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>All Buyers ({filteredBuyers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredBuyers.length === 0 ? (
              <EmptyState icon={Inbox} title="No buyers found" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Active Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuyers.map((buyer) => (
                      <TableRow key={buyer.id}>
                        <TableCell className="font-medium">
                          {buyer.name}
                        </TableCell>
                        <TableCell>
                          {buyer.company_name ? (
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {buyer.company_name}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {buyerTypeLabel(buyer.buyer_type || 'retail')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            {buyer.district || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Package className="w-3 h-3 mr-1" />
                            {buyer.totalOrders}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={buyer.activeOrders > 0 ? 'default' : 'outline'}>
                            {buyer.activeOrders}
                          </Badge>
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

export default AdminBuyers;
