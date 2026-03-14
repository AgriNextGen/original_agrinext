import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

const RECENT_KEY = 'agrinext_buyer_recent_searches';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  const recent = getRecent().filter((s) => s !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

interface CropSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CropSearchInput = ({ value, onChange, placeholder, className }: CropSearchInputProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('crops')
        .select('crop_name')
        .ilike('crop_name', `%${value}%`)
        .limit(8);
      const names = [...new Set((data || []).map((c) => c.crop_name))];
      setSuggestions(names);
    }, 250);
    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const select = (term: string) => {
    onChange(term);
    saveRecent(term);
    setRecent(getRecent());
    setOpen(false);
  };

  const showDropdown = open && (suggestions.length > 0 || (recent.length > 0 && !value));

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder || t('marketplace.searchCrops')}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="pl-10 pr-8"
      />
      {value && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => { onChange(''); setSuggestions([]); }}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                onClick={() => select(s)}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {s}
              </button>
            ))
          ) : (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('marketplace.recentSearches')}
              </p>
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                  onClick={() => select(r)}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {r}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CropSearchInput;
