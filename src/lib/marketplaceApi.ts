// src/lib/marketplaceApi.ts
// Simple wrapper to call Edge functions for marketplace actions.
type ApiResponse<T> = { success: boolean; request_id?: string; order_id?: string; data?: T; error?: string };

async function callFn(fn: string, body: any): Promise<any> {
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  return await res.json();
}

export async function placeOrder(listingId: string, qty: number, notes?: string) {
  return await callFn('place-order', { listing_id: listingId, qty, notes });
}

export async function confirmOrder(orderId: string) {
  return await callFn('confirm-order', { order_id: orderId });
}

export async function rejectOrder(orderId: string, reason: string) {
  return await callFn('reject-order', { order_id: orderId, reason });
}

export async function updateOrderStatus(orderId: string, newStatus: string, proofFileId?: string) {
  return await callFn('update-order-status', { order_id: orderId, new_status: newStatus, proof_file_id: proofFileId || null });
}

export async function getOrderDetail(orderId: string) {
  // call RPC or REST endpoint; to keep simple, call RPC via Supabase client on frontend when needed
  return await fetch(`/.netlify/functions/get-order-detail?order_id=${encodeURIComponent(orderId)}`).then(r => r.json());
}

