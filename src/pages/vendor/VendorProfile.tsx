import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Store, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { useVendorProfile, useUpdateVendorProfile } from '@/hooks/useVendorDashboard';

interface ProfileFormData {
  business_name: string;
  business_type: string;
  gst_number: string;
  contact_phone: string;
  contact_email: string;
  address: string;
}

const VendorProfile = () => {
  const { t } = useLanguage();
  const { data: profile, isLoading } = useVendorProfile();
  const updateProfile = useUpdateVendorProfile();

  const { register, handleSubmit, reset } = useForm<ProfileFormData>({
    defaultValues: {
      business_name: '',
      business_type: 'general',
      gst_number: '',
      contact_phone: '',
      contact_email: '',
      address: '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        business_name: profile.business_name ?? '',
        business_type: profile.business_type ?? 'general',
        gst_number: profile.gst_number ?? '',
        contact_phone: profile.contact_phone ?? '',
        contact_email: profile.contact_email ?? '',
        address: profile.address ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfile.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('vendor.profile.title')}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('vendor.profile.title')}>
      <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">{t('vendor.profile.title')}</h1>
        </div>

        {profile && (
          <div className="flex items-center gap-2">
            {profile.is_verified ? (
              <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle className="h-4 w-4" />
                {t('vendor.profile.verified')}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                <AlertCircle className="h-4 w-4" />
                {t('vendor.profile.notVerified')}
              </div>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('vendor.profile.title')}</CardTitle>
            <CardDescription>
              {t('vendor.profile.businessName')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vendor.profile.businessName')}</Label>
                  <Input {...register('business_name')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('vendor.profile.businessType')}</Label>
                  <Input {...register('business_type')} placeholder="e.g. fertilizer_shop, seed_dealer" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vendor.profile.gstNumber')}</Label>
                  <Input {...register('gst_number')} placeholder="GSTIN" />
                </div>
                <div className="space-y-2">
                  <Label>{t('vendor.profile.contactPhone')}</Label>
                  <Input type="tel" {...register('contact_phone')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('vendor.profile.contactEmail')}</Label>
                <Input type="email" {...register('contact_email')} />
              </div>

              <div className="space-y-2">
                <Label>{t('vendor.profile.address')}</Label>
                <Textarea {...register('address')} rows={3} />
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('vendor.profile.saving')}</>
                ) : (
                  t('vendor.profile.saveProfile')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorProfile;
