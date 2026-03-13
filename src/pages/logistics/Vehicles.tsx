import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, Plus, Edit, Trash2 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useVehicles, useTransporterProfile } from '@/hooks/useLogisticsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const vehicleTypes = [
  { value: 'truck', label: 'Truck' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'mini_truck', label: 'Mini Truck' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'tractor', label: 'Tractor Trolley' },
];

const Vehicles = () => {
  const { data: vehicles, isLoading } = useVehicles();
  const { data: transporter } = useTransporterProfile();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<{ id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_type: 'truck',
    capacity_kg: '',
    registration_number: '',
  });

  const handleEditClick = (vehicle: any) => {
    setEditingVehicle({ id: vehicle.id });
    setFormData({
      vehicle_type: vehicle.vehicle_type,
      capacity_kg: String(vehicle.capacity_kg ?? ''),
      registration_number: vehicle.registration_number ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!transporter?.id) {
      toast.error('Transporter profile not found');
      return;
    }

    if (!formData.registration_number || !formData.capacity_kg) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        const { error } = await supabase.from('vehicles').update({
          vehicle_type: formData.vehicle_type,
          capacity_kg: parseFloat(formData.capacity_kg),
          registration_number: formData.registration_number.toUpperCase(),
        }).eq('id', editingVehicle.id);
        if (error) throw error;
        toast.success('Vehicle updated successfully!');
      } else {
        const { error } = await supabase.from('vehicles').insert({
          transporter_id: transporter.id,
          vehicle_type: formData.vehicle_type,
          capacity_kg: parseFloat(formData.capacity_kg),
          registration_number: formData.registration_number.toUpperCase(),
        });
        if (error) throw error;
        toast.success('Vehicle added successfully!');
      }

      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsDialogOpen(false);
      setEditingVehicle(null);
      setFormData({ vehicle_type: 'truck', capacity_kg: '', registration_number: '' });
    } catch (error: any) {
      toast.error((editingVehicle ? 'Failed to update vehicle: ' : 'Failed to add vehicle: ') + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;

      toast.success('Vehicle deleted');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (error: any) {
      toast.error('Failed to delete vehicle: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="My Vehicles">
        <PageShell title="My Vehicles">
          <Skeleton className="h-10 w-48" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Vehicles">
      <PageShell
        title="My Vehicles"
        subtitle="Manage your fleet of vehicles"
        actions={<Button onClick={() => { setEditingVehicle(null); setFormData({ vehicle_type: 'truck', capacity_kg: '', registration_number: '' }); setIsDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>}
      >
      {/* Vehicles Grid */}
      {!vehicles || vehicles.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vehicles added yet"
          description="Add your first vehicle to start accepting loads"
          actionLabel="Add Vehicle"
          onAction={() => { setEditingVehicle(null); setFormData({ vehicle_type: 'truck', capacity_kg: '', registration_number: '' }); setIsDialogOpen(true); }}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    {vehicle.registration_number || 'No Reg.'}
                  </CardTitle>
                  <Badge variant="default">Registered</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{vehicle.vehicle_type?.replace('_', ' ') ?? 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-medium">{vehicle.capacity_kg ?? 0} kg</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClick(vehicle)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive"
                    onClick={() => handleDelete(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Vehicle Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setEditingVehicle(null); setFormData({ vehicle_type: 'truck', capacity_kg: '', registration_number: '' }); } setIsDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number *</Label>
              <Input
                id="registration_number"
                placeholder="e.g., KA-01-AB-1234"
                value={formData.registration_number}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Vehicle Type</Label>
              <Select 
                value={formData.vehicle_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity_kg">Capacity (kg) *</Label>
              <Input
                id="capacity_kg"
                type="number"
                placeholder="e.g., 5000"
                value={formData.capacity_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity_kg: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (editingVehicle ? 'Saving...' : 'Adding...') : (editingVehicle ? 'Save Changes' : 'Add Vehicle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageShell>
    </DashboardLayout>
  );
};

export default Vehicles;
