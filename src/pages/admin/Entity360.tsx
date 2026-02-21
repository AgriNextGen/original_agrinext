import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Lock, Unlock, LogOut, AlertTriangle, Clock, Shield, Ticket, MapPin, Users, Truck } from 'lucide-react';
import ReasonModal from '@/components/admin/ReasonModal';
import SecurityEventsList from '@/components/admin/SecurityEventsList';
import { useEntity360, useAiTimelineSummary, useLockUser, useUnlockUser, useOverrideTripStatus, useOverrideOrderStatus, useForceLogout, useSetAccountStatus, useResetRiskScore, useAddRiskScore } from '@/hooks/useEntity360';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';

const EVENT_TYPE_COLORS: Record<string, string> = {
  STATUS_CHANGED: 'bg-blue-100 text-blue-800',
  OVERRIDE: 'bg-red-100 text-red-800',
  CREATED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

function getEventColor(type: string) {
  for (const [key, color] of Object.entries(EVENT_TYPE_COLORS)) {
    if (type.includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-700';
}

export default function Entity360() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reasonModal, setReasonModal] = useState<{ action: string; open: boolean }>({ action: '', open: false });

  const { data, isLoading, error } = useEntity360(type || '', id || '');
  const { data: aiSummary, isLoading: aiLoading } = useAiTimelineSummary(type || '', id || '');

  const { data: agentSuggestions } = useQuery({
    queryKey: ['suggest-agents', id],
    queryFn: () => rpcJson('suggest_agents_for_farmer_v1', { p_farmer_user_id: id, p_limit: 5 }),
    enabled: type === 'user' && !!id,
    staleTime: 60_000,
  });

  const { data: transporterSuggestions } = useQuery({
    queryKey: ['suggest-transporters', id],
    queryFn: () => rpcJson('suggest_transporters_v1', { p_transport_request_id: id, p_limit: 10 }),
    enabled: type === 'transport_request' && !!id,
    staleTime: 60_000,
  });

  const lockUser = useLockUser();
  const unlockUser = useUnlockUser();
  const forceLogout = useForceLogout();
  const overrideTrip = useOverrideTripStatus();
  const overrideOrder = useOverrideOrderStatus();
  const setAccountStatus = useSetAccountStatus();
  const resetRisk = useResetRiskScore();
  const addRisk = useAddRiskScore();

  const core = data?.core;

  const handleAction = (reason: string) => {
    const action = reasonModal.action;
    setReasonModal({ action: '', open: false });

    if (action === 'lock' && core?.id) {
      lockUser.mutate({ userId: core.id, lock: true }, { onSuccess: () => toast({ title: 'User locked' }) });
    } else if (action === 'restrict' && core?.id) {
      const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      setAccountStatus.mutate({ userId: core.id, newStatus: 'restricted', reason, blockedUntil }, { onSuccess: () => toast({ title: 'User restricted for 24h' }) });
    } else if (action === 'unlock' && core?.id) {
      unlockUser.mutate({ userId: core.id, reason }, { onSuccess: () => toast({ title: 'User unlocked' }) });
    } else if (action === 'force_logout' && core?.id) {
      forceLogout.mutate({ userId: core.id }, { onSuccess: () => toast({ title: 'Session revoked' }) });
    } else if (action === 'override_trip' && id) {
      overrideTrip.mutate({ tripId: id, newStatus: 'cancelled', reason }, { onSuccess: () => toast({ title: 'Trip overridden' }) });
    } else if (action === 'override_order' && id) {
      overrideOrder.mutate({ orderId: id, newStatus: 'cancelled', reason }, { onSuccess: () => toast({ title: 'Order overridden' }) });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold capitalize">{type} Details</h1>
          <Badge variant="outline" className="text-xs font-mono">{id?.slice(0, 8)}</Badge>
        </div>

        {isLoading && <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>}
        {error && <Card><CardContent className="py-8 text-center text-red-500">Failed to load entity data.</CardContent></Card>}

        {core && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Core Info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Core Info</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  {Object.entries(core).filter(([k]) => !['roles'].includes(k)).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <dt className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt>
                      <dd className="font-medium text-right max-w-[200px] truncate">
                        {val === true ? 'Yes' : val === false ? 'No' : String(val ?? '—')}
                      </dd>
                    </div>
                  ))}
                  {core.roles && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Roles</dt>
                      <dd>{(core.roles as string[]).map((r: string) => <Badge key={r} variant="secondary" className="ml-1 text-xs">{r}</Badge>)}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Admin Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {type === 'user' && (
                  <>
                    {core.is_locked ? (
                      <Button variant="outline" className="w-full justify-start" onClick={() => setReasonModal({ action: 'unlock', open: true })}>
                        <Unlock className="h-4 w-4 mr-2" /> Unlock User
                      </Button>
                    ) : (
                      <Button variant="destructive" className="w-full justify-start" onClick={() => setReasonModal({ action: 'lock', open: true })}>
                        <Lock className="h-4 w-4 mr-2" /> Lock User
                      </Button>
                    )}
                    <Button variant="outline" className="w-full justify-start" onClick={() => setReasonModal({ action: 'force_logout', open: true })}>
                      <LogOut className="h-4 w-4 mr-2" /> Force Logout
                    </Button>
                  </>
                )}
                {type === 'trip' && (
                  <Button variant="destructive" className="w-full justify-start" onClick={() => setReasonModal({ action: 'override_trip', open: true })}>
                    <AlertTriangle className="h-4 w-4 mr-2" /> Override Trip Status
                  </Button>
                )}
                {type === 'order' && (
                  <Button variant="destructive" className="w-full justify-start" onClick={() => setReasonModal({ action: 'override_order', open: true })}>
                    <AlertTriangle className="h-4 w-4 mr-2" /> Override Order Status
                  </Button>
                )}

                {/* Related entities */}
                {data?.related && Object.entries(data.related).filter(([, v]) => v).length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-xs text-muted-foreground font-medium">Related Entities</p>
                    {Object.entries(data.related).filter(([, v]) => v).map(([key, val]) => {
                      const linkedType = key.replace(/_id$/, '');
                      return (
                        <Link key={key} to={`/admin/entity/${linkedType}/${val}`} className="block">
                          <Badge variant="secondary" className="cursor-pointer text-xs">
                            {key}: {String(val).slice(0, 8)}...
                          </Badge>
                        </Link>
                      );
                    })}
                  </>
                )}

                <Separator className="my-3" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Security events (30d): {data?.security_events_30d ?? 0}</span>
                </div>
              </CardContent>
            </Card>
            {/* Security Panel */}
            <Card>
              <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Account status</p>
                    <p className="font-medium">{core.account_status || 'active'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Blocked until</p>
                    <p className="font-medium">{core.blocked_until ? new Date(core.blocked_until).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk score</p>
                    <p className="font-medium">{core.risk_score ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Recent security events</p>
                    <p className="font-medium">{data?.security_events_30d ?? 0} (30d)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setReasonModal({ action: 'restrict', open: true })}>Restrict (24h)</Button>
                  <Button variant="destructive" onClick={() => setReasonModal({ action: 'lock', open: true })}>Lock</Button>
                  <Button variant="secondary" onClick={() => resetRisk.mutate({ userId: core.id, reason: 'Admin reset via entity360' })}>Reset risk</Button>
                  <Button variant="ghost" onClick={() => addRisk.mutate({ userId: core.id, delta: 5, reason: 'Manual increment' })}>+5 risk</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Geo Info */}
        {core && (core.geo_district_id || core.geo_state_id || core.district) && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Geography</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {core.geo_state_id && <Badge variant="outline">State: {core.geo_state_id.toString().slice(0, 8)}</Badge>}
                {core.geo_district_id && <Badge variant="outline">District: {core.geo_district_id.toString().slice(0, 8)}</Badge>}
                {core.district && <Badge variant="secondary">Legacy: {String(core.district)}</Badge>}
                {core.home_market_id && <Badge variant="outline">Market: {core.home_market_id.toString().slice(0, 8)}</Badge>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggested Agents (for user entities) */}
        {type === 'user' && agentSuggestions?.items && agentSuggestions.items.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Suggested Agents ({agentSuggestions.items.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {agentSuggestions.items.map((agent: any) => (
                  <div key={agent.agent_user_id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.agent_name || 'Agent'}</span>
                      <Badge variant="outline" className="text-xs">{agent.match_type}</Badge>
                      <span className="text-xs text-muted-foreground">{agent.service_district}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Tasks: {agent.open_tasks}</span>
                      <span>Farmers: {agent.assigned_farmers}</span>
                      <Badge variant="secondary" className="text-xs">Score: {agent.score}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              {agentSuggestions.reason && <p className="text-xs text-muted-foreground mt-2">{agentSuggestions.reason}</p>}
            </CardContent>
          </Card>
        )}

        {/* Suggested Transporters (for transport_request entities) */}
        {type === 'transport_request' && transporterSuggestions?.items && transporterSuggestions.items.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Suggested Transporters ({transporterSuggestions.items.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transporterSuggestions.items.map((t: any) => (
                  <div key={t.transporter_user_id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.transporter_name || 'Transporter'}</span>
                      <Badge variant="outline" className="text-xs">{t.match_type}</Badge>
                      <span className="text-xs text-muted-foreground">{t.service_district}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Active trips: {t.active_trips}</span>
                      <Badge variant="secondary" className="text-xs">Score: {t.score}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              {transporterSuggestions.reason && <p className="text-xs text-muted-foreground mt-2">{transporterSuggestions.reason}</p>}
            </CardContent>
          </Card>
        )}

        {/* Support Tickets */}
        {data?.tickets && data.tickets.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4" /> Open Tickets ({data.tickets.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.tickets.map((tk) => (
                  <div key={tk.id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{tk.category}</Badge>
                      <Badge className={tk.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>{tk.priority}</Badge>
                      <span className="truncate max-w-xs">{tk.message.slice(0, 80)}</span>
                    </div>
                    <Link to={`/admin/tickets`}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Summary Panel (lazy) */}
        <Card>
          <CardHeader><CardTitle className="text-base">AI Timeline Summary</CardTitle></CardHeader>
          <CardContent>
            {aiLoading && <Skeleton className="h-20 w-full" />}
            {!aiLoading && aiSummary && (
              <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                <p className="whitespace-pre-wrap">{aiSummary.output?.summary || 'No summary available'}</p>
                {aiSummary.output?.anomalies?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-xs text-orange-600">Anomalies:</p>
                    <ul className="list-disc pl-4 text-xs text-orange-600">
                      {aiSummary.output.anomalies.map((a: string, i: number) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Provider: {aiSummary.provider} | Confidence: {aiSummary.confidence ?? 'N/A'}</p>
              </div>
            )}
            {!aiLoading && !aiSummary && (
              <p className="text-sm text-muted-foreground">No AI summary available yet. It will be generated when an ops scan runs.</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        {data?.timeline && data.timeline.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Timeline ({data.timeline.length} events)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.timeline.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3 py-1">
                    <div className="flex-shrink-0">
                      <Clock className="h-3 w-3 mt-1 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getEventColor(ev.event_type)}`}>{ev.event_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString()}
                        </span>
                      </div>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {JSON.stringify(ev.metadata).slice(0, 120)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Security events (paginated) */}
        {type === 'user' && (
          <Card>
            <CardHeader><CardTitle className="text-base">Security Events</CardTitle></CardHeader>
            <CardContent>
              <SecurityEventsList actorId={id || ''} />
            </CardContent>
          </Card>
        )}

        <ReasonModal
          open={reasonModal.open}
          onClose={() => setReasonModal({ action: '', open: false })}
          onConfirm={handleAction}
          title={`Confirm: ${reasonModal.action.replace(/_/g, ' ')}`}
          description="This action will be audited. Provide a reason."
          loading={lockUser.isPending || unlockUser.isPending || forceLogout.isPending || overrideTrip.isPending || overrideOrder.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
