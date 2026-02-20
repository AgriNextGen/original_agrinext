import { useState, useEffect } from 'react';
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
import { Loader2, Save, Shield } from 'lucide-react';
import { useAgentQuickUpdate, useCreateSensitiveUpdateTask } from '@/hooks/useAgentQuickUpdate';
import { useLanguage } from '@/hooks/useLanguage';

interface FarmerQuickUpdateTabProps {
  farmer: {
    id: string;
    phone: string | null;
    village: string | null;
    taluk: string | null;
    preferred_language: string | null;
    total_land_area: number | null;
    district: string | null;
  };
}

export default function FarmerQuickUpdateTab({ farmer }: FarmerQuickUpdateTabProps) {
  const { language } = useLanguage();
  const quickUpdate = useAgentQuickUpdate();
  const sensitiveUpdate = useCreateSensitiveUpdateTask();

  // Safe fields state
  const [phone, setPhone] = useState(farmer.phone || '');
  const [village, setVillage] = useState(farmer.village || '');
  const [taluk, setTaluk] = useState(farmer.taluk || '');
  const [preferredLanguage, setPreferredLanguage] = useState(farmer.preferred_language || 'en');

  // Sensitive fields state
  const [totalLandArea, setTotalLandArea] = useState(String(farmer.total_land_area || ''));

  useEffect(() => {
    setPhone(farmer.phone || '');
    setVillage(farmer.village || '');
    setTaluk(farmer.taluk || '');
    setPreferredLanguage(farmer.preferred_language || 'en');
    setTotalLandArea(String(farmer.total_land_area || ''));
  }, [farmer]);

  const handleSafeUpdate = () => {
    const updates: Record<string, string | null> = {};
    if (phone !== (farmer.phone || '')) updates.phone = phone || null;
    if (village !== (farmer.village || '')) updates.village = village || null;
    if (taluk !== (farmer.taluk || '')) updates.taluk = taluk || null;
    if (preferredLanguage !== (farmer.preferred_language || 'en'))
      updates.preferred_language = preferredLanguage;

    if (Object.keys(updates).length === 0) return;
    quickUpdate.mutate({ farmerId: farmer.id, updates });
  };

  const handleSensitiveUpdate = () => {
    const proposed: Record<string, unknown> = {};
    if (totalLandArea !== String(farmer.total_land_area || '')) {
      proposed.total_land_area = parseFloat(totalLandArea) || 0;
    }
    if (Object.keys(proposed).length === 0) return;

    sensitiveUpdate.mutate({
      farmerId: farmer.id,
      proposedChanges: proposed,
      notes: `Land area change: ${farmer.total_land_area || 0} → ${totalLandArea}`,
    });
  };

  const hasSafeChanges =
    phone !== (farmer.phone || '') ||
    village !== (farmer.village || '') ||
    taluk !== (farmer.taluk || '') ||
    preferredLanguage !== (farmer.preferred_language || 'en');

  const hasSensitiveChanges =
    totalLandArea !== String(farmer.total_land_area || '');

  return (
    <div className="space-y-6">
      {/* Safe Fields - Direct Update */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Save className="h-4 w-4 text-primary" />
            {language === 'kn' ? 'ತ್ವರಿತ ನವೀಕರಣ' : 'Quick Update'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {language === 'kn'
              ? 'ಈ ಬದಲಾವಣೆಗಳು ತಕ್ಷಣ ಅನ್ವಯವಾಗುತ್ತವೆ'
              : 'These changes apply immediately'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{language === 'kn' ? 'ಫೋನ್' : 'Phone'}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>{language === 'kn' ? 'ಹಳ್ಳಿ' : 'Village'}</Label>
              <Input
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village name"
              />
            </div>
            <div>
              <Label>{language === 'kn' ? 'ತಾಲೂಕು' : 'Taluk'}</Label>
              <Input
                value={taluk}
                onChange={(e) => setTaluk(e.target.value)}
                placeholder="Taluk"
              />
            </div>
            <div>
              <Label>{language === 'kn' ? 'ಭಾಷೆ' : 'Language'}</Label>
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
          </div>
          <Button
            onClick={handleSafeUpdate}
            disabled={!hasSafeChanges || quickUpdate.isPending}
            className="w-full sm:w-auto"
          >
            {quickUpdate.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {language === 'kn' ? 'ಉಳಿಸಿ' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Sensitive Fields - Task-based Approval */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            {language === 'kn' ? 'ಅನುಮೋದನೆ ಬೇಕು' : 'Requires Approval'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {language === 'kn'
              ? 'ಈ ಬದಲಾವಣೆಗಳಿಗೆ ನಿರ್ವಾಹಕ ಅನುಮೋದನೆ ಅಗತ್ಯ'
              : 'These changes need admin approval before applying'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{language === 'kn' ? 'ಒಟ್ಟು ಭೂಮಿ (ಎಕರೆ)' : 'Total Land Area (acres)'}</Label>
              <Input
                type="number"
                value={totalLandArea}
                onChange={(e) => setTotalLandArea(e.target.value)}
                placeholder="Acres"
              />
            </div>
            <div>
              <Label>{language === 'kn' ? 'ಜಿಲ್ಲೆ' : 'District'}</Label>
              <Input
                value={farmer.district || ''}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'kn'
                  ? 'ಜಿಲ್ಲೆ ಬದಲಾವಣೆ ನಿರ್ವಾಹಕರಿಂದ ಮಾತ್ರ'
                  : 'District can only be changed by admin'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSensitiveUpdate}
            disabled={!hasSensitiveChanges || sensitiveUpdate.isPending}
            className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {sensitiveUpdate.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            {language === 'kn' ? 'ಅನುಮೋದನೆಗೆ ಕಳುಹಿಸಿ' : 'Submit for Approval'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
