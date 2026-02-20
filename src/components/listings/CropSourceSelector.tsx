import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sprout } from 'lucide-react';
import { HarvestReadyCrop } from '@/hooks/useTraceability';

interface CropSourceSelectorProps {
  crops: HarvestReadyCrop[];
  isLoading: boolean;
  selectedCropId: string;
  onSelectCrop: (cropId: string) => void;
  sourceMode: 'crop' | 'custom';
  onSourceModeChange: (mode: 'crop' | 'custom') => void;
}

const CropSourceSelector = ({
  crops,
  isLoading,
  selectedCropId,
  onSelectCrop,
  sourceMode,
  onSourceModeChange,
}: CropSourceSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Listing Source</Label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSourceModeChange('crop')}
          className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
            sourceMode === 'crop'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">From My Crops</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Auto-fill from crop data</p>
        </button>
        <button
          type="button"
          onClick={() => onSourceModeChange('custom')}
          className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
            sourceMode === 'custom'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50'
          }`}
        >
          <span className="text-sm font-medium">Custom Listing</span>
          <p className="text-xs text-muted-foreground mt-1">Enter details manually</p>
        </button>
      </div>

      {sourceMode === 'crop' && (
        <div className="space-y-2">
          <Label className="text-xs">Select Crop</Label>
          <Select value={selectedCropId} onValueChange={onSelectCrop} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Loading crops...' : 'Choose a crop...'} />
            </SelectTrigger>
            <SelectContent>
              {crops.map((crop) => (
                <SelectItem key={crop.id} value={crop.id}>
                  <div className="flex items-center gap-2">
                    <span>{crop.crop_name}{crop.variety ? ` (${crop.variety})` : ''}</span>
                    <Badge variant="outline" className="text-xs">
                      {crop.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
              {crops.length === 0 && !isLoading && (
                <SelectItem value="_none" disabled>
                  No crops available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default CropSourceSelector;
