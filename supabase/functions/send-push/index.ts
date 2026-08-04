// Edge Function genérica: recebe { user, title, body } do browser e envia
// uma notificação push a todas as subscrições guardadas do OUTRO utilizador.
// Usada tanto pelo "O Nosso Estado" como pelo aviso de ponto diário resgatado.
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:no-reply@amo-te-maria.vercel.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { user, title, body } = await req.json();
    if (!user || (user !== "maria" && user !== "ivan")) {
      return new Response(JSON.stringify({ error: "invalid user" }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const otherUser = user === "maria" ? "ivan" : "maria";

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?user_name=eq.${otherUser}&select=*`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    const subs = await res.json();

    const payload = JSON.stringify({
      title: title || "Amo-te, Maria",
      body: body || "",
    });

    const results = await Promise.allSettled(
      (subs || []).map((s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    return new Response(JSON.stringify({ sent: results.length }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
