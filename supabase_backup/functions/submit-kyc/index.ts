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
  const body = await req.json().catch(() => ({}))
  const { kyc_type, masked_identifier, metadata } = body
  if (!kyc_type) return new Response('kyc_type required', { status: 400 })

  const { data, error } = await supabase.rpc('secure.submit_kyc_v1', {
    p_kyc_type: kyc_type,
    p_masked_identifier: masked_identifier,
    p_metadata: metadata ?? {}
  })

  if (error) return new Response(JSON.stringify(error), { status: 400 })
  return new Response(JSON.stringify({ kyc_id: data }), { status: 200 })
})

