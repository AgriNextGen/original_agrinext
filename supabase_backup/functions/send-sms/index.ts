/**
 * Send SMS Hook - MSG91 integration for Supabase Phone Auth (India)
 *
 * Deploy: supabase functions deploy send-sms --no-verify-jwt
 *
 * Required secrets (set in Supabase Dashboard > Edge Functions > send-sms):
 * - SEND_SMS_HOOK_SECRETS: from Auth > Hooks > Send SMS (v1,whsec_...)
 * - MSG91_AUTH_KEY: your MSG91 auth key
 * - MSG91_SENDER_ID: DLT-registered sender ID (default: SMSIND)
 *
 * Configure in Supabase Dashboard → Authentication → Hooks → Send SMS:
 * - Type: HTTP
 * - URL: https://<project-ref>.supabase.co/functions/v1/send-sms
 * - Secret: (auto-generated)
 */

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
const MSG91_SENDER_ID = Deno.env.get("MSG91_SENDER_ID") || "SMSIND";

const sendSmsViaMsg91 = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  if (!MSG91_AUTH_KEY) {
    console.error("MSG91_AUTH_KEY is not set");
    return { success: false, error: "SMS provider not configured" };
  }

  // Remove + from phone for MSG91 (e.g. +919876543210 -> 919876543210)
  const mobile = phone.replace(/\D/g, "");
  const message = `Your AgriNext verification code is: ${otp}. Valid for 10 minutes.`;

  const params = new URLSearchParams({
    authkey: MSG91_AUTH_KEY,
    mobile,
    message,
    sender: MSG91_SENDER_ID,
    otp,
  });

  try {
    const res = await fetch(`https://api.msg91.com/api/sendotp.php?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => ({}));

    const success = res.ok && (data.type === "success" || data.message === "OTP sent successfully");
    if (!success) {
      console.error("MSG91 error:", data);
      return { success: false, error: data.message || data.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    console.error("MSG91 request failed:", err);
    return { success: false, error: String(err) };
  }
};

Deno.serve(async (req: Request) => {
  const payload = await req.text();
  const secretRaw = Deno.env.get("SEND_SMS_HOOK_SECRETS") || Deno.env.get("SEND_SMS_HOOK_SECRET");
  const secret = secretRaw?.replace(/^v1,whsec_/, "") || "";

  if (!secret) {
    console.error("SEND_SMS_HOOK_SECRETS not configured");
    return new Response(
      JSON.stringify({ error: { message: "Hook not configured" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(secret);

  try {
    const { user, sms } = wh.verify(payload, headers) as { user: { phone: string }; sms: { otp: string } };
    const result = await sendSmsViaMsg91(user.phone, sms.otp);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: {
            http_code: 500,
            message: result.error || "Failed to send SMS",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send SMS hook error:", err);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: `Failed to process: ${err instanceof Error ? err.message : String(err)}`,
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
