import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export default function AdminAutocomplete({ onSelect, placeholder = 'Search admins...' }: { onSelect: (userId: string) => void; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Array<{ user_id: string; name: string }>>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q) { setResults([]); return; }
      try {
        const { data } = await supabase.from('admin_users').select('user_id, name').ilike('name', `%${q}%`).limit(10);
        setResults(data || []);
      } catch (e) {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <Input value={q} onChange={(e:any) => setQ(e.target.value)} placeholder={placeholder} />
      {results.length > 0 && (
        <div className="absolute z-20 bg-white border mt-1 w-full max-h-48 overflow-auto">
          {results.map((r) => (
            <div key={r.user_id} className="p-2 hover:bg-muted cursor-pointer" onClick={() => { onSelect(r.user_id); setQ(''); setResults([]); }}>
              <div className="text-sm font-medium">{r.name || r.user_id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

