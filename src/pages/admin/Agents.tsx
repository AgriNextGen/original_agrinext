import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, CheckCircle, ClipboardList, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllAgents } from '@/hooks/useAdminDashboard';
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

const AdminAgents = () => {
  const { t } = useLanguage();
  const { data: agents, isLoading } = useAllAgents();
  const [search, setSearch] = useState('');

  const filteredAgents = agents?.filter(a => 
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.village?.toLowerCase().includes(search.toLowerCase()) ||
    a.district?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title={t('admin.agents.title')}>
      <PageShell
        title={t('admin.agents.title')}
        subtitle={t('admin.agents.subtitle')}
        actions={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.agents.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.agents.allAgents')} ({filteredAgents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredAgents.length === 0 ? (
                <EmptyState icon={Inbox} title={t('admin.agents.noAgents')} />
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.agents.name')}</TableHead>
                        <TableHead>{t('admin.agents.phone')}</TableHead>
                        <TableHead>{t('admin.agents.district')}</TableHead>
                        <TableHead>{t('admin.agents.farmersHandled')}</TableHead>
                        <TableHead>{t('admin.agents.tasks')}</TableHead>
                        <TableHead>{t('admin.agents.completionRate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">
                            {agent.full_name || t('admin.agents.unnamed')}
                          </TableCell>
                          <TableCell>{agent.phone || '-'}</TableCell>
                          <TableCell>{agent.district || agent.village || t('admin.farmers.unknown')}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <Users className="w-3 h-3 mr-1" />
                              {agent.farmersHandled}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ClipboardList className="w-3 h-3" />
                              {agent.completedTasks}/{agent.totalTasks}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              {agent.totalTasks > 0 
                                ? Math.round((agent.completedTasks / agent.totalTasks) * 100)
                                : 0}%
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

export default AdminAgents;
