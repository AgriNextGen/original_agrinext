import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  const body = await request.json().catch(() => ({}));
  return new Response(
    JSON.stringify({
      status: "queued",
      channel: body.channel ?? "push",
      message: body.message ?? "",
      recipient_profile_id: body.profile_id ?? null,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 202,
    },
  );
});
