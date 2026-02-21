import { supabase } from '@/integrations/supabase/client';

export async function rpcJson(fn: string, params: any = {}): Promise<any> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data;
}

export async function rpcMutate(fn: string, params: any = {}): Promise<any> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data;
}

export function makeCursor(updated_at: string | null, id: string | null) {
  if (!updated_at || !id) return null;
  return { updated_at, id };
}

export function parseCursor(cursor: any) {
  if (!cursor) return null;
  return { updated_at: cursor.updated_at, id: cursor.id };
}

