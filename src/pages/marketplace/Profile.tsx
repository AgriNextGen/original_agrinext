import { useState, useEffect } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Building, Save } from 'lucide-react';
import { useBuyerProfile } from '@/hooks/useMarketplaceDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import { toast } from 'sonner';

const buyerTypes = [
  { value: 'retail', label: 'Retail Buyer' },
  { value: 'wholesale', label: 'Wholesaler' },
  { value: 'restaurant', label: 'Restaurant/Hotel' },
  { value: 'export', label: 'Exporter' },
  { value: 'processor', label: 'Food Processor' },
];

const BuyerProfile = () => {
  const { data: profile, isLoading } = useBuyerProfile();
  const queryClient = useQueryClient();
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    district: '',
    buyer_type: 'retail',
    preferred_crops: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        company_name: profile.company_name || '',
        phone: profile.phone || '',
        district: profile.district || '',
        buyer_type: profile.buyer_type || 'retail',
        preferred_crops: profile.preferred_crops?.join(', ') || '',
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
      const preferredCrops = formData.preferred_crops
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const { error } = await supabase
        .from('buyers')
        .update({
          name: formData.name,
          company_name: formData.company_name || null,
          phone: formData.phone || null,
          district: formData.district || null,
          buyer_type: formData.buyer_type,
          preferred_crops: preferredCrops,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile updated!');
      queryClient.invalidateQueries({ queryKey: ['buyer-profile'] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Buyer Profile">
        <DataState loading><></></DataState>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Buyer Profile">
      <PageShell title="Buyer Profile" subtitle="Manage your marketplace profile">

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
                placeholder="Your name"
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
              <Label htmlFor="district">District</Label>
              <GeoDistrictSelect
                value=""
                onValueChange={(id) => setFormData(prev => ({ ...prev, district: id }))}
                placeholder={formData.district || 'Select district'}
              />
              {formData.district && (
                <p className="text-xs text-muted-foreground">Current: {formData.district}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Your company/business name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer_type">Buyer Type</Label>
              <Select 
                value={formData.buyer_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, buyer_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buyerTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="crops">Preferred Crops</Label>
              <Input
                id="crops"
                value={formData.preferred_crops}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_crops: e.target.value }))}
                placeholder="Rice, Wheat, Tomatoes (comma separated)"
              />
              <p className="text-xs text-muted-foreground">
                Enter crops you frequently purchase, separated by commas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default BuyerProfile;
