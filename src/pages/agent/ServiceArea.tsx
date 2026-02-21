import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useMyServiceAreas, useUpsertServiceArea, useDeleteServiceArea } from '@/hooks/useServiceAreas';
import GeoStateSelect from '@/components/geo/GeoStateSelect';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

export default function AgentServiceArea() {
  const { language } = useLanguage();
  const { data: areas, isLoading } = useMyServiceAreas('agent');
  const upsert = useUpsertServiceArea();
  const remove = useDeleteServiceArea();

  const [addMode, setAddMode] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const handleAdd = () => {
    if (!selectedDistrict && !selectedState) {
      toast.error('Select at least a state or district');
      return;
    }
    upsert.mutate(
      {
        role_scope: 'agent',
        state_id: selectedState || undefined,
        district_id: selectedDistrict || undefined,
      },
      {
        onSuccess: () => {
          toast.success(language === 'kn' ? 'ಸೇವಾ ಪ್ರದೇಶ ಸೇರಿಸಲಾಗಿದೆ' : 'Service area added');
          setAddMode(false);
          setSelectedState('');
          setSelectedDistrict('');
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleRemove = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => toast.success('Service area removed'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <DashboardLayout title={language === 'kn' ? 'ಸೇವಾ ಪ್ರದೇಶ' : 'Service Area'}>
      <PageHeader title={language === 'kn' ? 'ನನ್ನ ಸೇವಾ ಪ್ರದೇಶಗಳು' : 'My Service Areas'} subtitle={language === 'kn' ? 'ನೀವು ಸೇವೆ ನೀಡುವ ಜಿಲ್ಲೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ' : 'Manage the districts you serve. Farmers in these areas can be assigned to you.'}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Current areas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {language === 'kn' ? 'ಸಕ್ರಿಯ ಪ್ರದೇಶಗಳು' : 'Active Areas'}
            </CardTitle>
            {!addMode && (
              <Button size="sm" onClick={() => setAddMode(true)}>
                <Plus className="h-4 w-4 mr-1" /> {language === 'kn' ? 'ಸೇರಿಸಿ' : 'Add'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
            {!isLoading && (!areas || areas.length === 0) && (
              <EmptyState
                icon={MapPin}
                title={language === 'kn' ? 'ಯಾವುದೇ ಸೇವಾ ಪ್ರದೇಶಗಳು ಸೇರಿಸಲಾಗಿಲ್ಲ' : 'No service areas configured'}
                description={language === 'kn' ? 'ನಿಮ್ಮ ಸೇವಾ ಜಿಲ್ಲೆಗಳನ್ನು ಸೇರಿಸಿ' : 'Add your districts to get farmer assignments.'}
                actionLabel={language === 'kn' ? 'ಸೇರಿಸಿ' : 'Add Area'}
                onAction={() => setAddMode(true)}
              />
            )}
            {(areas ?? []).map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{area.district_name || 'State-level coverage'}</span>
                  <Badge variant={area.is_active ? 'default' : 'secondary'} className="text-xs">
                    {area.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemove(area.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Add new area */}
        {addMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'kn' ? 'ಹೊಸ ಪ್ರದೇಶ ಸೇರಿಸಿ' : 'Add Service Area'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'kn' ? 'ರಾಜ್ಯ' : 'State'}</Label>
                <GeoStateSelect
                  value={selectedState}
                  onValueChange={(v) => { setSelectedState(v); setSelectedDistrict(''); }}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'kn' ? 'ಜಿಲ್ಲೆ' : 'District'}</Label>
                <GeoDistrictSelect
                  stateId={selectedState || null}
                  value={selectedDistrict}
                  onValueChange={setSelectedDistrict}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={upsert.isPending}>
                  {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  {language === 'kn' ? 'ಸೇರಿಸಿ' : 'Add Area'}
                </Button>
                <Button variant="outline" onClick={() => { setAddMode(false); setSelectedState(''); setSelectedDistrict(''); }}>
                  {language === 'kn' ? 'ರದ್ದು' : 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </PageHeader>
    </DashboardLayout>
  );
}
