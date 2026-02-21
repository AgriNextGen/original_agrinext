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

export default function AgentProfile() {
  const { user } = useAuth();
  const { language } = useLanguage();
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
      toast.success(language === 'kn' ? 'ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಲಾಗಿದೆ' : 'Profile updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const isValid = fullName.trim() && phone.trim();

  if (isLoading) {
    return (
      <DashboardLayout title={language === 'kn' ? 'ನನ್ನ ಪ್ರೊಫೈಲ್' : 'My Profile'}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={language === 'kn' ? 'ನನ್ನ ಪ್ರೊಫೈಲ್' : 'My Profile'}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            {language === 'kn' ? 'ನನ್ನ ಪ್ರೊಫೈಲ್' : 'My Profile'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'kn'
              ? 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮಾಹಿತಿ ನವೀಕರಿಸಿ'
              : 'Update your profile information'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'kn' ? 'ಮೂಲ ಮಾಹಿತಿ' : 'Basic Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                {language === 'kn' ? 'ಪೂರ್ಣ ಹೆಸರು' : 'Full Name'} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={language === 'kn' ? 'ನಿಮ್ಮ ಹೆಸರು' : 'Your full name'}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {language === 'kn' ? 'ಫೋನ್ ಸಂಖ್ಯೆ' : 'Phone Number'} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                type="tel"
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'kn' ? 'ರಾಜ್ಯ' : 'State (Geo)'}</Label>
              <GeoStateSelect
                value={geoStateId}
                onValueChange={(v) => { setGeoStateId(v); setGeoDistrictId(''); }}
                placeholder={language === 'kn' ? 'ರಾಜ್ಯ ಆಯ್ಕೆಮಾಡಿ' : 'Select state'}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'kn' ? 'ಜಿಲ್ಲೆ' : 'District (Geo)'}</Label>
              <GeoDistrictSelect
                stateId={geoStateId || null}
                value={geoDistrictId}
                onValueChange={setGeoDistrictId}
                placeholder={language === 'kn' ? 'ಜಿಲ್ಲೆ ಆಯ್ಕೆಮಾಡಿ' : 'Select district'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'kn' ? 'ತಾಲ್ಲೂಕು' : 'Taluk'}</Label>
                <Input
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                  placeholder={language === 'kn' ? 'ತಾಲ್ಲೂಕು' : 'Taluk'}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'kn' ? 'ಹಳ್ಳಿ' : 'Village'}</Label>
                <Input
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder={language === 'kn' ? 'ಹಳ್ಳಿ' : 'Village'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'kn' ? 'ಆದ್ಯತೆ ಭಾಷೆ' : 'Preferred Language'}</Label>
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

            <Link to="/agent/service-area" className="block">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{language === 'kn' ? 'ಸೇವಾ ಪ್ರದೇಶಗಳು' : 'Service Areas'}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'kn' ? 'ನಿಮ್ಮ ಸೇವಾ ಜಿಲ್ಲೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ' : 'Manage the districts you serve'}
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
                  {language === 'kn' ? 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'kn' ? 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ' : 'Save Profile'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
