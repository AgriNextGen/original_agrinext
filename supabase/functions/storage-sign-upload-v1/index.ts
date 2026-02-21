import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getRequestIdFromHeaders, makeResponseWithRequestId, logStructured } from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET")!;

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization" };

function extFromMime(mime: string) {
  if (!mime) return 'bin';
  if (mime.startsWith('image/')) return 'jpg';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'audio/mpeg') return 'mp3';
  return 'bin';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const reqId = getRequestIdFromHeaders(req.headers);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '') || null;
    if (!token) return makeResponseWithRequestId(JSON.stringify({ error: 'Unauthorized' }), reqId, { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Validate user
    const { data: userRes } = await supabaseAdmin.auth.getUser(token);
    const user = userRes?.user ?? null;
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { bucket, content_type, size_bytes, entity } = body || {};
    if (!bucket || !content_type || !size_bytes || !entity || !entity.type || !entity.id) {
      return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit per user for signed URLs (window: 1 hour, limit 200)
    const rlKey = `storage-sign:${user.id}`;
    try {
      const { data: allowed, error: rlErr } = await supabaseAdmin.rpc('public.consume_rate_limit', { p_key: rlKey, p_limit: 200, p_window_seconds: 3600 });
      if (rlErr) console.warn('rate limit rpc error', rlErr);
      if (!allowed) {
        // log security event
        await supabaseAdmin.rpc('audit.log_security_event_v1', {
          p_request_id: reqId,
          p_event_type: 'upload_abuse',
          p_severity: 'medium',
          p_actor_user_id: user.id,
          p_rl_key: rlKey,
          p_ip_address: req.headers.get('x-forwarded-for') || null,
          p_device_id: req.headers.get('user-agent') || null,
          p_user_agent: req.headers.get('user-agent') || null,
          p_risk_score_snapshot: null,
          p_blocked_until: null,
          p_metadata: { bucket, content_type, size_bytes, entity }
        }).catch(()=>{});
        logStructured({ request_id: reqId, endpoint: "storage-sign-upload-v1", status: "rate_limited", user: user.id, rlKey });
        return makeResponseWithRequestId(JSON.stringify({ error: 'rate_limited' }), reqId, { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (e) {
      console.error('consume_rate_limit error', e);
    }

    // Build object path and insert into public.files via service role (owner_user_id set to actual user)
    const uuid = crypto.randomUUID();
    const ext = extFromMime(content_type);
    const object_path = `${entity.type}/${entity.id}/${uuid}.${ext}`;
    const bucketName = bucket;

    // Insert into files registry
    const insertRes = await supabaseAdmin.from('files').insert([{
      bucket: bucketName,
      object_path,
      owner_user_id: user.id,
      entity_type: entity.type,
      entity_id: entity.id,
      purpose: entity.purpose || 'upload',
      mime_type: content_type,
      size_bytes: size_bytes,
      visibility: 'private',
      status: 'pending'
    }]).select('id').maybeSingle();

    if (insertRes.error) {
      console.error('files insert error', insertRes.error);
      logStructured({ request_id: reqId, endpoint: "storage-sign-upload-v1", status: "files_insert_failed", error: insertRes.error });
      return makeResponseWithRequestId(JSON.stringify({ error: 'files_insert_failed' }), reqId, { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const file_id = insertRes.data?.id;

    // Create signed upload URL (short expiry)
    let signedUrl = null;
    try {
      // Supabase storage createSignedUploadUrl API
      const { data: signedData, error: signedErr } = await supabaseAdmin.storage.from(bucketName).createSignedUploadUrl(object_path, 60 * 10);
      if (signedErr || !signedData) {
        console.error('createSignedUploadUrl error', signedErr);
      } else {
        signedUrl = signedData.signedUrl ?? signedData.signed_url ?? signedData;
      }
    } catch (e) {
      console.error('signed url generation failed', e);
    }

    // Log workflow event for file signed
    try {
      await supabaseAdmin.rpc('audit.log_workflow_event_v1', {
        p_request_id: reqId, p_entity_type: 'file', p_entity_id: file_id, p_event_type: 'FILE_SIGNED',
        p_actor_user_id: user.id, p_actor_role: null, p_geo_lat: null, p_geo_long: null, p_device_id: null, p_file_id: null,
        p_ip_address: req.headers.get('x-forwarded-for') || null, p_user_agent: req.headers.get('user-agent') || null, p_metadata: { bucket: bucketName, object_path }
      }).catch(()=>{});
      logStructured({ request_id: reqId, endpoint: "storage-sign-upload-v1", status: "file_signed", user: user.id, file_id });
    } catch (e) { /* best-effort */ }

    return makeResponseWithRequestId(JSON.stringify({
      file_id,
      bucket: bucketName,
      path: object_path,
      token: signedUrl
    }), reqId, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const reqId = getRequestIdFromHeaders(req.headers);
    console.error('storage-sign-upload-v1 error', err);
    logStructured({ request_id: reqId, endpoint: "storage-sign-upload-v1", status: "error", error: err instanceof Error ? err.message : String(err) });
    return makeResponseWithRequestId(JSON.stringify({ error: err instanceof Error ? err.message : 'internal' }), reqId, { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

