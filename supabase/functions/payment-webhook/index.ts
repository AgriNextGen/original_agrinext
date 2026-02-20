import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

serve(async (req) => {
  // This endpoint should verify provider signature before calling the DB.
  // Implementation depends on provider (Razorpay/Stripe). Example: verify header signature.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const body = await req.text()
  const json = JSON.parse(body || '{}')

  // TODO: verify signature here
  const verified = true
  if (!verified) return new Response('Invalid signature', { status: 403 })

  // Map webhook to payment event
  const user_id = json.metadata?.user_id ?? null
  const event_type = json.event || json.type || 'payment_webhook'
  const provider = 'provider_name'
  const amount = json.data?.amount ?? null
  const status = json.data?.status ?? 'unknown'

  const { data, error } = await supabase.rpc('secure.record_payment_event_v1', {
    p_user_id: user_id,
    p_event_type: event_type,
    p_provider: provider,
    p_amount: amount,
    p_status: status,
    p_metadata: json
  })

  if (error) {
    return new Response(JSON.stringify(error), { status: 500 })
  }
  return new Response(JSON.stringify({ id: data }), { status: 200 })
})

