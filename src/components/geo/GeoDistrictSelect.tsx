import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGeoDistricts } from '@/hooks/useGeoSearch';

interface Props {
  stateId?: string | null;
  value?: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function GeoDistrictSelect({ stateId, value, onValueChange, placeholder = 'Select district', disabled, className }: Props) {
  const { data: districts, isLoading } = useGeoDistricts(stateId);

  return (
    <Select value={value || ''} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(districts ?? []).map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.name_en}{d.state_name ? ` (${d.state_name})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
