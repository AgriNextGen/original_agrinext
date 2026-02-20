import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { TraceSettings } from '@/hooks/useTraceability';

interface TraceSettingsPanelProps {
  settings: TraceSettings;
  onChange: (settings: TraceSettings) => void;
}

const TraceSettingsPanel = ({ settings, onChange }: TraceSettingsPanelProps) => {
  const update = (key: keyof TraceSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Traceability Settings (QR Page)</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Control what buyers see when scanning your QR code
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Origin Detail Level</Label>
          <Select
            value={settings.show_origin_level}
            onValueChange={(v) => update('show_origin_level', v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="district">District only</SelectItem>
              <SelectItem value="district_village">District + Village</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Show crop details</Label>
          <Switch
            checked={settings.show_crop_details}
            onCheckedChange={(v) => update('show_crop_details', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Show crop timeline</Label>
          <Switch
            checked={settings.show_crop_timeline}
            onCheckedChange={(v) => update('show_crop_timeline', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Show stage photos on QR</Label>
          <Switch
            checked={settings.show_stage_photos}
            onCheckedChange={(v) => update('show_stage_photos', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Show input/fertilizer photos on QR</Label>
          <Switch
            checked={settings.show_input_photos}
            onCheckedChange={(v) => update('show_input_photos', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Show soil report on QR</Label>
          <Switch
            checked={settings.show_soil_report}
            onCheckedChange={(v) => update('show_soil_report', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Show geo verification badge</Label>
          <Switch
            checked={settings.show_geo_proof ?? false}
            onCheckedChange={(v) => update('show_geo_proof', v)}
          />
        </div>
      </div>
    </div>
  );
};

export default TraceSettingsPanel;
