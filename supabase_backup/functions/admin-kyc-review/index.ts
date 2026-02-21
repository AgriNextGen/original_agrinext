import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return new Response('Unauthorized', { status: 401 })

  supabase.auth.setAuth(token)
  // Caller must be admin; function will enforce but we also can do role checks if desired
  const body = await req.json().catch(() => ({}))
  const { kyc_record_id, new_status, reason } = body
  if (!kyc_record_id || !new_status) return new Response('missing params', { status: 400 })

  const { error } = await supabase.rpc('secure.admin_update_kyc_status_v1', {
    p_kyc_record_id: kyc_record_id,
    p_new_status: new_status,
    p_reason: reason ?? null
  })

  if (error) return new Response(JSON.stringify(error), { status: 403 })
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})

