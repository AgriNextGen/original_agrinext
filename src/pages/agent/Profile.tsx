import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Save, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSetProfileGeo } from '@/hooks/useServiceAreas';
import GeoStateSelect from '@/components/geo/GeoStateSelect';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/routes';

export default function AgentProfile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const setProfileGeo = useSetProfileGeo();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['agent-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [taluk, setTaluk] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [geoStateId, setGeoStateId] = useState('');
  const [geoDistrictId, setGeoDistrictId] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setDistrict(profile.district || '');
      setVillage(profile.village || '');
      setTaluk(profile.taluk || '');
      setPreferredLanguage(profile.preferred_language || 'en');
      setGeoStateId(profile.geo_state_id || '');
      setGeoDistrictId(profile.geo_district_id || '');
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!fullName.trim() || !phone.trim()) {
        throw new Error('Name and phone are required');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          district,
          village: village.trim() || null,
          taluk: taluk.trim() || null,
          preferred_language: preferredLanguage,
        })
        .eq('id', user.id);

      if (error) throw error;

      if (geoStateId || geoDistrictId) {
        await setProfileGeo.mutateAsync({
          state_id: geoStateId || undefined,
          district_id: geoDistrictId || undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-profile'] });
      toast.success(t('agent.profile.profileUpdated'));
    },
    onError: (error) => {
      toast.error(error.message || t('agent.profile.updateFailed'));
    },
  });

  const isValid = fullName.trim() && phone.trim();

  return (
    <DashboardLayout title={t('agent.profile.title')}>
      <PageHeader title={t('agent.profile.title')} subtitle={t('agent.profile.subtitle')}>
      {isLoading ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
      <div className="max-w-2xl mx-auto space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('agent.profile.basicInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                {t('agent.profile.fullName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('agent.profile.fullNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t('agent.profile.phoneNumber')} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={phone}
                readOnly
                disabled
                className="bg-muted"
                type="tel"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('agent.profile.state')}</Label>
              <GeoStateSelect
                value={geoStateId}
                onValueChange={(v) => { setGeoStateId(v); setGeoDistrictId(''); }}
                placeholder={t('agent.profile.selectState')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('agent.profile.district')}</Label>
              <GeoDistrictSelect
                stateId={geoStateId || null}
                value={geoDistrictId}
                onValueChange={setGeoDistrictId}
                placeholder={t('agent.profile.selectDistrict')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('agent.profile.taluk')}</Label>
                <Input
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                  placeholder={t('agent.profile.taluk')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('agent.profile.village')}</Label>
                <Input
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder={t('agent.profile.village')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('agent.profile.preferredLanguage')}</Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Link to={ROUTES.AGENT.SERVICE_AREA} className="block">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{t('agent.profile.serviceAreas')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('agent.profile.manageServiceAreas')}
                  </p>
                </div>
              </div>
            </Link>

            <Button
              onClick={() => updateProfile.mutate()}
              disabled={!isValid || updateProfile.isPending}
              className="w-full"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('agent.profile.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('agent.profile.saveProfile')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      )}
      </PageHeader>
    </DashboardLayout>
  );
}
