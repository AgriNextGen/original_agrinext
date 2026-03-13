import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Trash2, Loader2 } from 'lucide-react';
import { useMyServiceAreas, useUpsertServiceArea, useDeleteServiceArea } from '@/hooks/useServiceAreas';
import GeoStateSelect from '@/components/geo/GeoStateSelect';
import GeoDistrictSelect from '@/components/geo/GeoDistrictSelect';
import DataState from '@/components/ui/DataState';
import { toast } from 'sonner';

export default function LogisticsServiceArea() {
  const { data: areas, isLoading } = useMyServiceAreas('logistics');
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
        role_scope: 'logistics',
        state_id: selectedState || undefined,
        district_id: selectedDistrict || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Service area added');
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
    <DashboardLayout title="Service Area">
      <PageShell title="My Service Areas" subtitle="Manage the districts you operate in. Transport requests in these areas will be suggested to you." className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Active Areas</CardTitle>
            {!addMode && (
              <Button size="sm" onClick={() => setAddMode(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <DataState loading={isLoading} empty={!isLoading && (!areas || areas.length === 0)} emptyTitle="No service areas" emptyMessage="No service areas configured yet. Add your operating districts.">
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
            </DataState>
          </CardContent>
        </Card>

        {addMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Service Area</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>State</Label>
                <GeoStateSelect
                  value={selectedState}
                  onValueChange={(v) => { setSelectedState(v); setSelectedDistrict(''); }}
                />
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <GeoDistrictSelect
                  stateId={selectedState || null}
                  value={selectedDistrict}
                  onValueChange={setSelectedDistrict}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={upsert.isPending}>
                  {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add Area
                </Button>
                <Button variant="outline" onClick={() => { setAddMode(false); setSelectedState(''); setSelectedDistrict(''); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </PageShell>
    </DashboardLayout>
  );
}
