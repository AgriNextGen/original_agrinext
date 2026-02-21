import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGeoStates } from '@/hooks/useGeoSearch';

interface Props {
  value?: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function GeoStateSelect({ value, onValueChange, placeholder = 'Select state', disabled, className }: Props) {
  const { data: states, isLoading } = useGeoStates();

  return (
    <Select value={value || ''} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(states ?? []).map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name_en}{s.name_local ? ` (${s.name_local})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
