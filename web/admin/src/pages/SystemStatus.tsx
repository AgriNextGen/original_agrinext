import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export default function SystemStatus() {
  const [config, setConfig] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [ticketsCount, setTicketsCount] = useState<number>(0);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll(){
    const { data: cfg } = await supabase.rpc('get_app_config_v1');
    setConfig(cfg);
    const { data: errs } = await supabase.from('analytics.recent_errors_v').select('*').limit(50);
    setErrors(errs || []);
    const { count } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });
    setTicketsCount(count || 0);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>System Status</h1>
      <section>
        <h2>App Config</h2>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </section>
      <section>
        <h2>Recent Errors</h2>
        <table>
          <thead><tr><th>time</th><th>event_type</th><th>endpoint</th><th>request_id</th></tr></thead>
          <tbody>
            {errors.map((e: any) => (<tr key={e.event_id}><td>{e.created_at}</td><td>{e.event_type}</td><td>{e.endpoint}</td><td>{e.request_id}</td></tr>))}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Support Tickets</h2>
        <div>Pending tickets: {ticketsCount}</div>
      </section>
    </div>
  );
}

