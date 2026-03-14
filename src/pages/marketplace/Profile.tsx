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
import { User, Building, Save, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useBuyerProfile } from '@/hooks/useMarketplaceDashboard';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import { toast } from 'sonner';

const buyerTypeKeys = [
  { value: 'retail', labelKey: 'marketplace.retailBuyer' },
  { value: 'wholesale', labelKey: 'marketplace.wholesaler' },
  { value: 'restaurant', labelKey: 'marketplace.restaurant' },
  { value: 'export', labelKey: 'marketplace.exporter' },
  { value: 'processor', labelKey: 'marketplace.foodProcessor' },
];

const BuyerProfile = () => {
  const { t } = useLanguage();
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
      toast.error(t('marketplace.profileNotFound'));
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

      toast.success(t('marketplace.profileUpdated'));
      queryClient.invalidateQueries({ queryKey: ['buyer-profile'] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${t('marketplace.updateFailed')}: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('marketplace.buyerProfile')}>
        <DataState loading><></></DataState>
      </DashboardLayout>
    );
  }

  const completionFields = [
    formData.name,
    formData.phone,
    formData.district,
    formData.company_name,
    formData.buyer_type,
    formData.preferred_crops,
  ];
  const filledCount = completionFields.filter(Boolean).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  const buyerTypeLabel = buyerTypeKeys.find((bt) => bt.value === formData.buyer_type);

  return (
    <DashboardLayout title={t('marketplace.buyerProfile')}>
      <PageShell title={t('marketplace.buyerProfile')} subtitle={t('marketplace.manageProfile')}>

      {/* Profile Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-semibold truncate">{profile?.name || t('common.user')}</h2>
              <div className="flex items-center gap-2 mt-1">
                {buyerTypeLabel && (
                  <Badge variant="outline" className="text-xs">
                    {t(buyerTypeLabel.labelKey)}
                  </Badge>
                )}
                {profile?.district && (
                  <span className="text-sm text-muted-foreground">{profile.district}</span>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">{t('marketplace.profileCompletion')}</span>
              <span className="text-sm font-semibold">{completionPct}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            {completionPct === 100 && (
              <p className="flex items-center gap-1 mt-1.5 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('marketplace.profileComplete')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('marketplace.personalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('marketplace.fullName')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('marketplace.fullNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('marketplace.phoneNumber')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t('marketplace.phonePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">{t('marketplace.district')}</Label>
              <GeoDistrictSelect
                value={formData.district || ''}
                onValueChange={(id) => setFormData(prev => ({ ...prev, district: id }))}
                placeholder={t('marketplace.selectDistrict')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              {t('marketplace.businessDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">{t('marketplace.companyName')}</Label>
              <Input
                id="company"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder={t('marketplace.companyPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer_type">{t('marketplace.buyerType')}</Label>
              <Select 
                value={formData.buyer_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, buyer_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buyerTypeKeys.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="crops">{t('marketplace.preferredCrops')}</Label>
              <Input
                id="crops"
                value={formData.preferred_crops}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_crops: e.target.value }))}
                placeholder={t('marketplace.preferredCropsPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('marketplace.preferredCropsHelp')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('marketplace.saving') : t('marketplace.saveChanges')}
          </Button>
        </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default BuyerProfile;
