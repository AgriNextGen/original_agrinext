import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';

function EventRow({ ev }: { ev: any }) {
  return (
    <div className="flex items-start gap-3 text-sm border-b py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge className="text-xs bg-gray-100 text-gray-800">{ev.severity}</Badge>
          <span className="font-medium">{ev.event_type}</span>
          <span className="text-xs text-muted-foreground ml-2">{new Date(ev.created_at).toLocaleString()}</span>
        </div>
        {ev.metadata && <p className="text-xs text-muted-foreground mt-1 truncate">{JSON.stringify(ev.metadata)}</p>}
      </div>
    </div>
  );
}

export default function SecurityEventsList({ actorId }: { actorId: string }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-events', actorId, cursor],
    queryFn: () => rpcJson('admin.list_security_events_v1', { p_actor_id: actorId, p_limit: limit, p_cursor: cursor }),
    enabled: !!actorId,
    keepPreviousData: true,
  });

  const items = data || [];

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {!isLoading && items.length === 0 && <div className="text-sm text-muted-foreground">No security events</div>}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {items.map((ev: any) => <EventRow key={ev.id} ev={ev} />)}
      </div>
      <div className="flex gap-2 mt-2">
        <Button disabled={isLoading || items.length === 0} onClick={() => {
          if (items.length > 0) {
            const last = items[items.length - 1];
            setCursor(last.created_at);
          }
        }}>Load older</Button>
        <Button variant="outline" onClick={() => { setCursor(null); refetch(); }}>Reset</Button>
      </div>
    </div>
  );
}

