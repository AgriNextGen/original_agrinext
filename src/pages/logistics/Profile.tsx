import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Save, Truck } from 'lucide-react';
import { useTransporterProfile } from '@/hooks/useLogisticsDashboard';
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

const Profile = () => {
  const { data: profile, isLoading } = useTransporterProfile();
  const queryClient = useQueryClient();
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle_type: '',
    vehicle_capacity: '',
    registration_number: '',
    operating_village: '',
    operating_district: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        vehicle_type: profile.vehicle_type || '',
        vehicle_capacity: profile.vehicle_capacity?.toString() || '',
        registration_number: profile.registration_number || '',
        operating_village: profile.operating_village || '',
        operating_district: profile.operating_district || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile?.id) {
      toast.error('Profile not found');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transporters')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          vehicle_type: formData.vehicle_type || null,
          vehicle_capacity: formData.vehicle_capacity ? parseFloat(formData.vehicle_capacity) : null,
          registration_number: formData.registration_number || null,
          operating_village: formData.operating_village || null,
          operating_district: formData.operating_district || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['transporter-profile'] });
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="My Profile">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile">
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your transporter profile and settings
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operating_village">Operating Village</Label>
              <Input
                id="operating_village"
                value={formData.operating_village}
                onChange={(e) => setFormData(prev => ({ ...prev, operating_village: e.target.value }))}
                placeholder="Your base village"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operating_district">Operating District</Label>
              <Input
                id="operating_district"
                value={formData.operating_district}
                onChange={(e) => setFormData(prev => ({ ...prev, operating_district: e.target.value }))}
                placeholder="Your operating district"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Primary Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Vehicle Type</Label>
              <Select 
                value={formData.vehicle_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
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
              <Label htmlFor="vehicle_capacity">Capacity (tons)</Label>
              <Input
                id="vehicle_capacity"
                type="number"
                value={formData.vehicle_capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_capacity: e.target.value }))}
                placeholder="e.g., 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                value={formData.registration_number}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                placeholder="e.g., KA-01-AB-1234"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              You can add more vehicles from the Vehicles page
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
