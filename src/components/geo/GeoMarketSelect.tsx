import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGeoMarkets } from '@/hooks/useGeoSearch';

interface Props {
  districtId?: string | null;
  value?: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function GeoMarketSelect({ districtId, value, onValueChange, placeholder = 'Select market', disabled, className }: Props) {
  const { data: markets, isLoading } = useGeoMarkets(districtId);

  if (!districtId) return null;

  return (
    <Select value={value || ''} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? 'Loading...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(markets ?? []).map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name_en} ({m.market_type})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
