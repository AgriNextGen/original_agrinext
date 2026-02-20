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
import { useAllFarmers, useAllCrops, useUpdateCropStatus } from '@/hooks/useAgentDashboard';
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

const AgentFarmers = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { data: farmers, isLoading: farmersLoading } = useAllFarmers();
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
          toast.success(
            language === 'kn'
              ? 'ರೈತ ನಿಮಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ'
              : 'Farmer assigned to you successfully'
          );
        },
      }
    );
  };

  const getAssignmentBadge = (farmer: any) => {
    if (farmer.is_assigned_to_me) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <UserCheck className="h-3 w-3" />
          {language === 'kn' ? 'ನಿಮಗೆ' : 'Yours'}
        </Badge>
      );
    }
    if (farmer.is_assigned_to_other) {
      return (
        <Badge variant="secondary" className="opacity-60">
          {language === 'kn' ? 'ಇನ್ನೊಬ್ಬರಿಗೆ' : 'Other Agent'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {language === 'kn' ? 'ನಿಯೋಜಿಸಿಲ್ಲ' : 'Unassigned'}
      </Badge>
    );
  };

  const unassignedCount = farmers?.filter((f: any) => !f.assigned_agent_id).length || 0;
  const myCount = farmers?.filter((f: any) => f.is_assigned_to_me).length || 0;

  return (
    <DashboardLayout title={language === 'kn' ? 'ರೈತ ಡೈರೆಕ್ಟರಿ' : 'Farmer Directory'}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {language === 'kn' ? 'ರೈತ ಡೈರೆಕ್ಟರಿ' : 'Farmer Directory'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'kn'
              ? 'ನಿಮ್ಮ ಜಿಲ್ಲೆಯ ರೈತರನ್ನು ಹುಡುಕಿ ಮತ್ತು ನಿಯೋಜಿಸಿ'
              : 'Find and assign farmers in your district'}
          </p>
        </div>

        {/* Search + Village Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                language === 'kn'
                  ? 'ಹೆಸರು, ಹಳ್ಳಿ, ಫೋನ್‌ನಿಂದ ಹುಡುಕಿ...'
                  : 'Search by name, village, phone...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={villageFilter} onValueChange={setVillageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === 'kn' ? 'ಎಲ್ಲಾ ಹಳ್ಳಿಗಳು' : 'All Villages'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'kn' ? 'ಎಲ್ಲಾ ಹಳ್ಳಿಗಳು' : 'All Villages'}
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
              {language === 'kn' ? 'ನಿಯೋಜಿಸಿಲ್ಲ' : 'Unassigned'} ({unassignedCount})
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {language === 'kn' ? 'ನನ್ನವರು' : 'Assigned to Me'} ({myCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {language === 'kn' ? 'ಎಲ್ಲಾ' : 'All'} ({farmers?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Content for all tabs uses same table */}
          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {farmersLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'kn' ? 'ಹೆಸರು' : 'Name'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಹಳ್ಳಿ' : 'Village'}</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          {language === 'kn' ? 'ಫೋನ್' : 'Phone'}
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          {language === 'kn' ? 'ಬೆಳೆಗಳು' : 'Crops'}
                        </TableHead>
                        <TableHead>{language === 'kn' ? 'ಸ್ಥಿತಿ' : 'Status'}</TableHead>
                        <TableHead>{language === 'kn' ? 'ಕ್ರಿಯೆ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarmers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">
                              {language === 'kn'
                                ? 'ಯಾವುದೇ ರೈತರು ಕಂಡುಬಂದಿಲ್ಲ'
                                : 'No farmers found'}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFarmers.map((farmer: any) => (
                          <TableRow key={farmer.id}>
                            <TableCell className="font-medium">
                              {farmer.full_name || (language === 'kn' ? 'ಅಪರಿಚಿತ' : 'Unknown')}
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
                                      {language === 'kn' ? 'ನಿಯೋಜಿಸಿ' : 'Assign'}
                                    </>
                                  )}
                                </Button>
                              ) : farmer.is_assigned_to_me ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {language === 'kn' ? 'ನಿಯೋಜಿತ' : 'Assigned'}
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AgentFarmers;
