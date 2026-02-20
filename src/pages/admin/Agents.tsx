import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, CheckCircle, ClipboardList } from 'lucide-react';
import { useAllAgents } from '@/hooks/useAdminDashboard';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminAgents = () => {
  const { data: agents, isLoading } = useAllAgents();
  const [search, setSearch] = useState('');

  const filteredAgents = agents?.filter(a => 
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.village?.toLowerCase().includes(search.toLowerCase()) ||
    a.district?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title="Agent Management">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" />
              Agent Management
            </h1>
            <p className="text-muted-foreground">View and manage field agents</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Agents ({filteredAgents.length})</CardTitle>
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
                      <TableHead>District</TableHead>
                      <TableHead>Farmers Handled</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">
                          {agent.full_name || 'Unnamed'}
                        </TableCell>
                        <TableCell>{agent.phone || '-'}</TableCell>
                        <TableCell>{agent.district || agent.village || 'Unknown'}</TableCell>
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
                    {filteredAgents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No agents found
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

export default AdminAgents;
