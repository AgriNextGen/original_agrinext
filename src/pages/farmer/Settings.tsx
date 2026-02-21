import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useFarmerProfile } from '@/hooks/useFarmerDashboard';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSetProfileGeo } from '@/hooks/useServiceAreas';
import GeoStateSelect from '@/components/geo/GeoStateSelect';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import GeoMarketSelect from '@/components/geo/GeoMarketSelect';
import { 
  User, 
  Save,
  Loader2,
  Shield,
  Bell,
  Globe,
  Check
} from 'lucide-react';

const SettingsPage = () => {
  const { data: profile, isLoading } = useFarmerProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, setLanguage, isLoading: languageLoading, t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const setProfileGeo = useSetProfileGeo();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    village: '',
    district: '',
  });
  const [geoStateId, setGeoStateId] = useState('');
  const [geoDistrictId, setGeoDistrictId] = useState('');
  const [geoMarketId, setGeoMarketId] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        village: profile.village || '',
        district: profile.district || '',
      });
      setGeoStateId(profile.geo_state_id || '');
      setGeoDistrictId(profile.geo_district_id || '');
      setGeoMarketId(profile.home_market_id || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          village: formData.village || null,
          district: formData.district || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      if (geoStateId || geoDistrictId || geoMarketId) {
        await setProfileGeo.mutateAsync({
          state_id: geoStateId || undefined,
          district_id: geoDistrictId || undefined,
          market_id: geoMarketId || undefined,
        });
      }
      
      toast({ title: t('toast.profile_updated') });
      queryClient.invalidateQueries({ queryKey: ['farmer-profile', user.id] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'FM';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('nav.settings')}>
        <DataState loading>
          <></>
        </DataState>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('nav.settings')}>
      <PageShell title={t('nav.settings')} className="max-w-3xl">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('settings.profile_information')}
            </CardTitle>
            <CardDescription>
              {t('settings.update_info')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {getInitials(formData.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{formData.full_name || t('roles.farmer')}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{t('settings.full_name')}</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder={t('settings.full_name_placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('settings.phone')}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="village">{t('settings.village')}</Label>
                    <Input
                      id="village"
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      placeholder={t('settings.village_placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">{t('settings.district')} (text)</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder={t('settings.district_placeholder')}
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">{language === 'kn' ? 'ಭೌಗೋಳಿಕ ಮಾಹಿತಿ' : 'Geographic Location'}</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'kn' ? 'ರಾಜ್ಯ' : 'State'}</Label>
                    <GeoStateSelect
                      value={geoStateId}
                      onValueChange={(v) => { setGeoStateId(v); setGeoDistrictId(''); setGeoMarketId(''); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'kn' ? 'ಜಿಲ್ಲೆ' : 'District'}</Label>
                    <GeoDistrictSelect
                      stateId={geoStateId || null}
                      value={geoDistrictId}
                      onValueChange={(v) => { setGeoDistrictId(v); setGeoMarketId(''); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'kn' ? 'ಮಾರುಕಟ್ಟೆ' : 'Home Market'}</Label>
                    <GeoMarketSelect
                      districtId={geoDistrictId || null}
                      value={geoMarketId}
                      onValueChange={setGeoMarketId}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('common.save_changes')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {t('settings.preferences')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('settings.push_notifications')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.push_notifications_desc')}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">{t('settings.configure')}</Button>
            </div>
            
            {/* Language Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('settings.language')}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'en' ? t('common.english') : t('common.kannada')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={language === 'en' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setLanguage('en')}
                  disabled={languageLoading}
                >
                  {language === 'en' && <Check className="h-3 w-3 mr-1" />}
                  {t('common.english')}
                </Button>
                <Button 
                  variant={language === 'kn' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setLanguage('kn')}
                  disabled={languageLoading}
                >
                  {language === 'kn' && <Check className="h-3 w-3 mr-1" />}
                  {t('common.kannada')}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('settings.account_security')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.account_security_desc')}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">{t('settings.manage')}</Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default SettingsPage;
