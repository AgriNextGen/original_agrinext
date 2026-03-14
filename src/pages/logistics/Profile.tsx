import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Save, Truck, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTransporterProfile } from '@/hooks/useLogisticsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

const vehicleTypes = [
  { value: 'truck', label: 'Truck' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'mini_truck', label: 'Mini Truck' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'tractor', label: 'Tractor Trolley' },
];

const MAX_CAPACITY: Record<string, number> = {
  truck: 25, pickup: 5, mini_truck: 8, tempo: 10, tractor: 15,
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 2) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5, 10)}`.trim();
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return raw;
}

const Profile = () => {
  const { t } = useLanguage();
  const { data: profile, isLoading } = useTransporterProfile();
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const completion = useMemo(() => {
    const fields = [
      formData.name,
      formData.phone,
      formData.vehicle_type,
      formData.vehicle_capacity,
      formData.registration_number,
      formData.operating_village,
      formData.operating_district,
    ];
    const filled = fields.filter((f) => f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [formData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.phone) {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length < 10) newErrors.phone = t('validation.phone_required');
    }
    if (formData.vehicle_capacity) {
      const cap = parseFloat(formData.vehicle_capacity);
      if (isNaN(cap) || cap <= 0) {
        newErrors.vehicle_capacity = t('validation.required');
      } else {
        const max = MAX_CAPACITY[formData.vehicle_type] ?? 30;
        if (cap > max) {
          newErrors.vehicle_capacity = `Max ${max} tons for ${formData.vehicle_type.replace('_', ' ')}`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!profile?.id) {
      toast.error(t('logistics.profileNotFound') || 'Profile not found');
      return;
    }
    if (!validate()) return;

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

      toast.success(t('logistics.profileUpdated') || 'Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['transporter-profile'] });
    } catch (error: any) {
      toast.error(t('errors.profileUpdateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.myProfile') || 'My Profile'}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('logistics.myProfile') || 'My Profile'}>
      <PageShell title={t('logistics.myProfile') || 'My Profile'} subtitle={t('logistics.manageProfile') || 'Manage your transporter profile and settings'}>

      {/* Profile Completion */}
      <Card className={cn(
        'border-2',
        completion === 100 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
      )}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {completion === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">
                  {completion === 100
                    ? (t('logistics.profileComplete') || 'Profile complete')
                    : (t('logistics.completeYourProfile') || 'Complete your profile')}
                </p>
                <span className="text-sm font-bold tabular-nums">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('logistics.personalInfo') || 'Personal Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('logistics.fullName') || 'Full Name'} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); setErrors(prev => ({ ...prev, name: '' })); }}
                placeholder={t('logistics.enterFullName') || 'Enter your full name'}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('logistics.phoneNumber') || 'Phone Number'}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => { setFormData(prev => ({ ...prev, phone: e.target.value })); setErrors(prev => ({ ...prev, phone: '' })); }}
                onBlur={() => {
                  if (formData.phone) {
                    setFormData(prev => ({ ...prev, phone: formatPhone(prev.phone) }));
                  }
                }}
                placeholder="+91 98765 43210"
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="operating_village">{t('logistics.operatingVillage') || 'Operating Village'}</Label>
              <Input
                id="operating_village"
                value={formData.operating_village}
                onChange={(e) => setFormData(prev => ({ ...prev, operating_village: e.target.value }))}
                placeholder={t('logistics.baseVillage') || 'Your base village'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operating_district">{t('logistics.operatingDistrict') || 'Operating District'}</Label>
              <GeoDistrictSelect
                value={formData.operating_district || ''}
                onValueChange={(id) => {
                  setFormData(prev => ({ ...prev, operating_district: id }));
                }}
                placeholder={t('logistics.selectDistrict') || 'Select district'}
              />
            </div>

            <Link to="/logistics/service-area" className="block mt-2">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{t('logistics.serviceAreas') || 'Service Areas'}</p>
                  <p className="text-xs text-muted-foreground">{t('logistics.manageDistricts') || 'Manage districts you operate in'}</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {t('logistics.primaryVehicle') || 'Primary Vehicle'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">{t('logistics.vehicleType') || 'Vehicle Type'}</Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('logistics.selectVehicleType') || 'Select vehicle type'} />
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
              <Label htmlFor="vehicle_capacity">
                {t('logistics.capacityTons') || 'Capacity (tons)'}
                {formData.vehicle_type && (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (max {MAX_CAPACITY[formData.vehicle_type] ?? 30}t)
                  </span>
                )}
              </Label>
              <Input
                id="vehicle_capacity"
                type="number"
                min="0"
                max={MAX_CAPACITY[formData.vehicle_type] ?? 30}
                step="0.5"
                value={formData.vehicle_capacity}
                onChange={(e) => { setFormData(prev => ({ ...prev, vehicle_capacity: e.target.value })); setErrors(prev => ({ ...prev, vehicle_capacity: '' })); }}
                placeholder="e.g., 5"
                className={errors.vehicle_capacity ? 'border-destructive' : ''}
              />
              {errors.vehicle_capacity && <p className="text-xs text-destructive">{errors.vehicle_capacity}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_number">{t('logistics.registrationNumber') || 'Registration Number'}</Label>
              <Input
                id="registration_number"
                value={formData.registration_number}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value.toUpperCase() }))}
                placeholder="e.g., KA-01-AB-1234"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t('logistics.addMoreVehiclesHint') || 'You can add more vehicles from the Vehicles page'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? (t('common.saving') || 'Saving...') : (t('common.save_changes') || 'Save Changes')}
        </Button>
      </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default Profile;
