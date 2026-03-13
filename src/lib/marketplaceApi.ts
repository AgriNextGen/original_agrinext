// src/lib/marketplaceApi.ts
// Wrapper for marketplace actions. Uses Supabase client directly — no Netlify functions needed.
import { supabase } from '@/integrations/supabase/client';

type ApiResponse<T = unknown> = { success: boolean; request_id?: string; order_id?: string; data?: T; error?: string };

export async function placeOrder(
  listingId: string,
  qty: number,
  notes?: string | null,
): Promise<ApiResponse> {
  const { data, error } = await supabase.rpc('place_order_v1', {
    p_listing_id: listingId,
    p_qty: qty,
    p_notes: notes ?? null,
  } as any);
  if (error) return { success: false, error: error.message };
  const result = data as any;
  return { success: true, order_id: result?.order_id, data: result };
}

export async function confirmOrder(orderId: string): Promise<ApiResponse> {
  const { data, error } = await supabase.rpc('confirm_order_v1', { p_order_id: orderId } as any);
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as any };
}

export async function rejectOrder(orderId: string, reason: string): Promise<ApiResponse> {
  const { data, error } = await supabase.rpc('reject_order_v1', { p_order_id: orderId, p_reason: reason } as any);
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as any };
}

export async function updateOrderStatus(orderId: string, newStatus: string, proofFileId?: string): Promise<ApiResponse> {
  const { data, error } = await supabase.rpc('update_order_status_v1', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_proof_file_id: proofFileId ?? null,
  } as any);
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as any };
}

export async function createPaymentOrder(orderId: string, provider?: string): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-order`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ order_id: orderId, provider: provider || 'razorpay' }),
    }
  );
  return await res.json();
}
