import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Search,
  MapPin,
  Phone,
  Sprout,
  Truck,
  Eye,
  Play
} from 'lucide-react';
import { useAssignedFarmers, useStartVisit, useActiveVisit } from '@/hooks/useAgentAssignments';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

export default function AgentMyFarmers() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { data: farmers, isLoading } = useAssignedFarmers();
  const startVisit = useStartVisit();
  const { data: activeVisit } = useActiveVisit();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredFarmers = farmers?.filter(
    (f) =>
      f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.village?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.district?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartVisit = (farmerId: string) => {
    if (activeVisit) {
      toast.error(
        language === 'kn'
          ? 'ದಯವಿಟ್ಟು ಮೊದಲು ಪ್ರಸ್ತುತ ಭೇಟಿಯನ್ನು ಮುಗಿಸಿ'
          : 'Please end your current visit first'
      );
      return;
    }
    startVisit.mutate({ farmerId });
  };

  return (
    <DashboardLayout
      title={language === 'kn' ? 'ನನ್ನ ರೈತರು' : 'My Farmers'}
    >
      <PageHeader title={language === 'kn' ? 'ನನ್ನ ರೈತರು' : 'My Farmers'} subtitle={language === 'kn' ? 'ನಿಮಗೆ ನಿಯೋಜಿಸಲಾದ ರೈತರು' : 'Farmers assigned to you'}>
      <div className="space-y-6">

        {/* Active Visit Banner */}
        {activeVisit && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium">
                  {language === 'kn' ? 'ಸಕ್ರಿಯ ಭೇಟಿ' : 'Active Visit'}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(`/agent/visit/${activeVisit.id}`)}>
                {language === 'kn' ? 'ನೋಡಿ' : 'View'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              language === 'kn'
                ? 'ಹೆಸರು, ಹಳ್ಳಿ, ಜಿಲ್ಲೆಯಿಂದ ಹುಡುಕಿ...'
                : 'Search by name, village, district...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{farmers?.length || 0}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'kn' ? 'ಒಟ್ಟು ರೈತರು' : 'Total Farmers'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {farmers?.reduce((sum, f) => sum + (f.ready_crops_count || 0), 0) || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'kn' ? 'ಕೊಯ್ಲಿಗೆ ಸಿದ್ಧ' : 'Ready to Harvest'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {farmers?.reduce((sum, f) => sum + (f.crops_count || 0), 0) || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'kn' ? 'ಸಕ್ರಿಯ ಬೆಳೆಗಳು' : 'Active Crops'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">
                {farmers?.reduce((sum, f) => sum + (f.pending_transport_count || 0), 0) || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'kn' ? 'ಬಾಕಿ ಸಾರಿಗೆ' : 'Pending Transport'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Farmers Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
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
                    <TableHead>{language === 'kn' ? 'ಸ್ಥಳ' : 'Location'}</TableHead>
                    <TableHead>{language === 'kn' ? 'ಫೋನ್' : 'Phone'}</TableHead>
                    <TableHead>{language === 'kn' ? 'ಬೆಳೆಗಳು' : 'Crops'}</TableHead>
                    <TableHead>{language === 'kn' ? 'ಸಾರಿಗೆ' : 'Transport'}</TableHead>
                    <TableHead>{language === 'kn' ? 'ಕ್ರಿಯೆಗಳು' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFarmers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={Users}
                          title={language === 'kn' ? 'ಯಾವುದೇ ರೈತರು ಕಂಡುಬಂದಿಲ್ಲ' : 'No farmers found'}
                          description={language === 'kn' ? 'ನಿಮಗೆ ಯಾವುದೇ ರೈತರು ನಿಯೋಜಿಸಲಿಲ್ಲ.' : 'No farmers assigned to you yet.'}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFarmers?.map((farmer) => (
                      <TableRow key={farmer.id}>
                        <TableCell className="font-medium">
                          {farmer.full_name || (language === 'kn' ? 'ಅಪರಿಚಿತ' : 'Unknown')}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {[farmer.village, farmer.district]
                              .filter(Boolean)
                              .join(', ') || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Sprout className="h-3 w-3" />
                              {farmer.crops_count || 0}
                            </Badge>
                            {(farmer.ready_crops_count || 0) > 0 && (
                              <Badge className="bg-green-100 text-green-800">
                                {farmer.ready_crops_count} {language === 'kn' ? 'ಸಿದ್ಧ' : 'ready'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(farmer.pending_transport_count || 0) > 0 ? (
                            <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                              <Truck className="h-3 w-3" />
                              {farmer.pending_transport_count}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/agent/farmer/${farmer.id}`)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              {language === 'kn' ? 'ನೋಡಿ' : 'View'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStartVisit(farmer.id)}
                              disabled={startVisit.isPending || !!activeVisit}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {language === 'kn' ? 'ಭೇಟಿ' : 'Visit'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      </PageHeader>
    </DashboardLayout>
  );
}
