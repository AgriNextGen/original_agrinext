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
  const { kyc_record_id, file_id, document_type } = body
  if (!kyc_record_id || !file_id || !document_type) return new Response('missing params', { status: 400 })

  const { data, error } = await supabase.rpc('secure.add_kyc_document_v1', {
    p_kyc_record_id: kyc_record_id,
    p_file_id: file_id,
    p_document_type: document_type
  })

  if (error) return new Response(JSON.stringify(error), { status: 400 })
  return new Response(JSON.stringify({ document_id: data }), { status: 200 })
})

