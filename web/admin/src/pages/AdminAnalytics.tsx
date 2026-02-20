import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export default function AdminAnalytics() {
  const [summary, setSummary] = useState<any>(null);
  const [transport, setTransport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData(){
    setLoading(true);
    const { data: s } = await supabase.from('analytics.dashboard_summary_v').select('*').limit(1);
    setSummary(s?.[0] ?? null);
    const { data: t } = await supabase.from('analytics.transport_daily').select('*').order('day', { ascending: false }).limit(14).is('district', null);
    setTransport(t || []);
    setLoading(false);
  }

  async function backfill30(){
    setMessage(null);
    setLoading(true);
    const end = new Date();
    // compute IST yesterday
    const istOffsetMin = 5.5 * 60;
    const utcNow = new Date(end.toISOString());
    const istNow = new Date(utcNow.getTime() + istOffsetMin * 60 * 1000);
    const yesterday = new Date(istNow.getTime() - 24*60*60*1000);
    const p_end = yesterday.toISOString().slice(0,10);
    const start = new Date(yesterday.getTime() - 29*24*60*60*1000);
    const p_start = start.toISOString().slice(0,10);

    try {
      const res = await fetch('/.netlify/functions/analytics-rollup-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_start, p_end })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || JSON.stringify(json));
      setMessage('Backfill started');
    } catch (err: any) {
      setMessage(`Backfill failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Analytics (admin)</h1>
      {loading && <div>Loading...</div>}
      {message && <div>{message}</div>}
      <section>
        <h2>Summary (30d)</h2>
        <pre>{JSON.stringify(summary, null, 2)}</pre>
      </section>
      <section>
        <h2>Transport (last 14 days)</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: 8 }}>day</th>
              <th style={{ border: '1px solid #ddd', padding: 8 }}>loads_accepted</th>
              <th style={{ border: '1px solid #ddd', padding: 8 }}>trips_completed</th>
            </tr>
          </thead>
          <tbody>
            {transport.map((r) => (
              <tr key={`${r.day}`}>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.day}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.loads_accepted}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.trips_completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div style={{ marginTop: 16 }}>
        <button onClick={backfill30} disabled={loading}>Backfill last 30 days</button>
      </div>
    </div>
  );
}

