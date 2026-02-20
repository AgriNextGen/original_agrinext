import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useAllTransportRequests, useAllFarmers, useAllCrops } from '@/hooks/useAgentDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, 
  Plus, 
  MapPin, 
  Calendar,
  Package,
  Search,
  Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  en_route: 'bg-purple-100 text-purple-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const AgentTransport = () => {
  const { data: requests, isLoading } = useAllTransportRequests();
  const { data: farmers } = useAllFarmers();
  const { data: crops } = useAllCrops();
  const queryClient = useQueryClient();
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [newRequest, setNewRequest] = useState({
    farmer_id: '',
    crop_id: '',
    quantity: '',
    pickup_village: '',
    preferred_date: new Date().toISOString().split('T')[0],
  });

  const filteredRequests = requests?.filter((req) => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = 
      (req as any).farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.pickup_village?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req as any).crop?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && (searchQuery === '' || matchesSearch);
  });

  const handleCreateRequest = async () => {
    if (!newRequest.farmer_id || !newRequest.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const { error } = await supabase.from('transport_requests').insert({
        farmer_id: newRequest.farmer_id,
        crop_id: newRequest.crop_id || null,
        quantity: parseFloat(newRequest.quantity),
        pickup_village: newRequest.pickup_village,
        pickup_location: newRequest.pickup_village,
        preferred_date: newRequest.preferred_date,
        status: 'requested',
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['all-transport-requests'] });
      toast.success('Transport request created');
      setIsCreateOpen(false);
      setNewRequest({
        farmer_id: '',
        crop_id: '',
        quantity: '',
        pickup_village: '',
        preferred_date: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      toast.error('Failed to create request');
      console.error(error);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: 'requested' | 'assigned' | 'en_route' | 'picked_up' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('transport_requests')
        .update({ status: newStatus })
        .eq('id', requestId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['all-transport-requests'] });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const farmerCrops = crops?.filter(c => c.farmer_id === newRequest.farmer_id) || [];

  return (
    <DashboardLayout title="Transport">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Transport Requests
            </h1>
            <p className="text-muted-foreground">Manage transport and pickup requests</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Transport Request</DialogTitle>
                <DialogDescription>Request transport for a farmer's crops</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Farmer *</Label>
                  <Select 
                    value={newRequest.farmer_id} 
                    onValueChange={(v) => setNewRequest({ ...newRequest, farmer_id: v, crop_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select farmer" />
                    </SelectTrigger>
                    <SelectContent>
                      {farmers?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.full_name || 'Unknown'} - {f.village || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Crop</Label>
                  <Select 
                    value={newRequest.crop_id} 
                    onValueChange={(v) => setNewRequest({ ...newRequest, crop_id: v })}
                    disabled={!newRequest.farmer_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {farmerCrops.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.crop_name} - {c.estimated_quantity || '?'} {c.quantity_unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Quantity (quintals) *</Label>
                  <Input
                    type="number"
                    value={newRequest.quantity}
                    onChange={(e) => setNewRequest({ ...newRequest, quantity: e.target.value })}
                    placeholder="Enter quantity"
                  />
                </div>
                
                <div>
                  <Label>Pickup Village</Label>
                  <Input
                    value={newRequest.pickup_village}
                    onChange={(e) => setNewRequest({ ...newRequest, pickup_village: e.target.value })}
                    placeholder="Enter village name"
                  />
                </div>
                
                <div>
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={newRequest.preferred_date}
                    onChange={(e) => setNewRequest({ ...newRequest, preferred_date: e.target.value })}
                  />
                </div>
                
                <Button onClick={handleCreateRequest} className="w-full">
                  Create Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by farmer, village, or crop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', 'requested', 'assigned', 'en_route', 'delivered'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport Table */}
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
                    <TableHead>Farmer</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No transport requests found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests?.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {(req as any).farmer?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {(req as any).crop ? (
                            <Badge variant="outline" className="bg-green-50">
                              {(req as any).crop.crop_name}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {req.quantity} {req.quantity_unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {req.pickup_village || req.pickup_location}
                          </span>
                        </TableCell>
                        <TableCell>
                          {req.preferred_date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(req.preferred_date), 'MMM d')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[req.status]}>
                            {req.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.status === 'requested' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(req.id, 'assigned')}
                            >
                              Assign
                            </Button>
                          )}
                          {req.status === 'assigned' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(req.id, 'en_route')}
                            >
                              Start
                            </Button>
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
      </div>
    </DashboardLayout>
  );
};

export default AgentTransport;
