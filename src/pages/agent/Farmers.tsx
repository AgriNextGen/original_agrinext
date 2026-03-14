import { useState, useMemo } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAllFarmers, useAllCrops } from '@/hooks/useAgentDashboard';
import { useAssignFarmerToAgent } from '@/hooks/useAgentAssignments';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Sprout,
  MapPin,
  Phone,
  Search,
  UserPlus,
  CheckCircle,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';

const AgentFarmers = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: farmers, isLoading: farmersLoading } = useAllFarmers();
  const loadingTimedOut = useLoadingTimeout(farmersLoading);
  const { data: crops } = useAllCrops();
  const assignFarmer = useAssignFarmerToAgent();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('unassigned');
  const [villageFilter, setVillageFilter] = useState('all');

  // Get unique villages for filter
  const villages = useMemo(() => {
    const set = new Set<string>();
    farmers?.forEach((f: any) => {
      if (f.village) set.add(f.village);
    });
    return Array.from(set).sort();
  }, [farmers]);

  // Filter farmers
  const filteredFarmers = useMemo(() => {
    let list = farmers || [];

    // Tab filter
    if (activeTab === 'unassigned') {
      list = list.filter((f: any) => !f.assigned_agent_id);
    } else if (activeTab === 'mine') {
      list = list.filter((f: any) => f.is_assigned_to_me);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f: any) =>
          f.full_name?.toLowerCase().includes(q) ||
          f.village?.toLowerCase().includes(q) ||
          f.phone?.includes(q)
      );
    }

    // Village filter
    if (villageFilter !== 'all') {
      list = list.filter((f: any) => f.village === villageFilter);
    }

    return list;
  }, [farmers, activeTab, searchQuery, villageFilter]);

  const getCropCount = (farmerId: string) => {
    return crops?.filter((c) => c.farmer_id === farmerId).length || 0;
  };

  const handleAssign = (farmerId: string) => {
    if (!user?.id) return;
    assignFarmer.mutate(
      { farmerId, agentId: user.id },
      {
        onSuccess: () => {
          toast.success(t('agent.farmers.assignSuccess'));
        },
      }
    );
  };

  const getAssignmentBadge = (farmer: any) => {
    if (farmer.is_assigned_to_me) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <UserCheck className="h-3 w-3" />
          {t('agent.farmers.yours')}
        </Badge>
      );
    }
    if (farmer.is_assigned_to_other) {
      return (
        <Badge variant="secondary" className="opacity-60">
          {t('agent.farmers.otherAgent')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {t('agent.farmers.unassignedBadge')}
      </Badge>
    );
  };

  const unassignedCount = farmers?.filter((f: any) => !f.assigned_agent_id).length || 0;
  const myCount = farmers?.filter((f: any) => f.is_assigned_to_me).length || 0;

  return (
    <DashboardLayout title={t('agent.farmers.title')}>
      <PageHeader title={t('agent.farmers.title')} subtitle={t('agent.farmers.subtitle')}>
      <div className="space-y-6">

        {/* Search + Village Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('agent.farmers.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={villageFilter} onValueChange={setVillageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('agent.farmers.allVillages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('agent.farmers.allVillages')}
              </SelectItem>
              {villages.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="unassigned" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t('agent.farmers.unassigned')} ({unassignedCount})
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {t('agent.farmers.assignedToMe')} ({myCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('agent.farmers.all')} ({farmers?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* All three tab values render the same table (filtered by activeTab) */}
          {['unassigned', 'mine', 'all'].map((tabVal) => (
          <TabsContent key={tabVal} value={tabVal} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {farmersLoading && !loadingTimedOut ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('agent.farmers.name')}</TableHead>
                        <TableHead>{t('agent.farmers.village')}</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          {t('agent.farmers.phone')}
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          {t('agent.farmers.crops')}
                        </TableHead>
                        <TableHead>{t('agent.farmers.status')}</TableHead>
                        <TableHead>{t('agent.farmers.action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarmers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <EmptyState
                              icon={Users}
                              title={t('agent.farmers.noFarmers')}
                              description={t('agent.farmers.noFarmersDescription')}
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFarmers.map((farmer: any) => (
                          <TableRow key={farmer.id}>
                            <TableCell className="font-medium">
                              {farmer.full_name || t('agent.farmers.unknown')}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {farmer.village || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {farmer.phone ? (
                                <a
                                  href={`tel:${farmer.phone}`}
                                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {farmer.phone}
                                </a>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <Sprout className="h-3 w-3" />
                                {getCropCount(farmer.id)}
                              </Badge>
                            </TableCell>
                            <TableCell>{getAssignmentBadge(farmer)}</TableCell>
                            <TableCell>
                              {!farmer.assigned_agent_id ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleAssign(farmer.id)}
                                  disabled={assignFarmer.isPending}
                                >
                                  {assignFarmer.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <UserPlus className="h-3 w-3 mr-1" />
                                      {t('agent.farmers.assign')}
                                    </>
                                  )}
                                </Button>
                              ) : farmer.is_assigned_to_me ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('agent.farmers.assigned')}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          ))}
        </Tabs>
      </div>
      </PageHeader>
    </DashboardLayout>
  );
};

export default AgentFarmers;
