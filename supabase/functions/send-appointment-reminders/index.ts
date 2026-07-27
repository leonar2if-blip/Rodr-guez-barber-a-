// Edge Function para enviar recordatorios de citas
// Se ejecuta cada 5 minutos via pg_cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Appointment {
  id: number;
  appointment_date: string;
  appointment_time: string;
  client_id: string;
  status: string;
  service_id: number;
  client_name?: string;
  service_name?: string;
  fcm_token?: string;
  notified_24h?: boolean;
  notified_1h?: boolean;
  notified_5min?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID")!;
    const firebaseClientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
    const firebasePrivateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, "\n");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener citas confirmadas de hoy y mañana
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFormat = (date: Date) => date.toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        client_id,
        service_id,
        notified_24h,
        notified_1h,
        notified_5min,
        profiles!client_id (
          full_name,
          fcm_token
        ),
        services (
          name
        )
      `)
      .eq("status", "confirmed")
      .gte("appointment_date", dateFormat(today))
      .lte("appointment_date", dateFormat(tomorrow));

    if (error) {
      console.error("Error fetching appointments:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    let notificationsSent = 0;

    for (const appt of appointments as any[]) {
      const clientName = appt.profiles?.full_name || "Cliente";
      const serviceName = appt.services?.name || "servicio";
      const fcmToken = appt.profiles?.fcm_token;
      const appointmentDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
      const now = new Date();
      const diffMs = appointmentDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMinutes = diffMs / (1000 * 60);

      let message = "";
      let shouldNotify = false;
      let updateField = "";

      // Notificación 24 horas antes
      if (diffHours > 23 && diffHours <= 24 && !appt.notified_24h) {
        message = `⏰ Hola ${clientName}! Mañana tienes cita a las ${appt.appointment_time.slice(0, 5)} para ${serviceName}. ¡Te esperamos!`;
        shouldNotify = true;
        updateField = "notified_24h";
      }
      // Notificación 1 hora antes
      else if (diffHours > 0.5 && diffHours <= 1 && !appt.notified_1h) {
        message = `🚨 ${clientName}, tu cita es en 1 hora (${appt.appointment_time.slice(0, 5)}). ¡Te esperamos!`;
        shouldNotify = true;
        updateField = "notified_1h";
      }
      // Notificación 5 minutos antes
      else if (diffMinutes > 0 && diffMinutes <= 5 && !appt.notified_5min) {
        message = `⏱️ ${clientName}, es tu turno en 5 minutos. Prepárate!`;
        shouldNotify = true;
        updateField = "notified_5min";
      }

      // Enviar notificación si aplica y hay token
      if (shouldNotify && fcmToken) {
        await sendFCMNotification(fcmToken, "Recordatorio de Cita", message, {
          appointmentId: appt.id.toString(),
          type: "reminder",
        });

        // Marcar como notificado
        await supabase
          .from("appointments")
          .update({ [updateField]: true })
          .eq("id", appt.id);

        notificationsSent++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Recordatorios procesados. ${notificationsSent} notificaciones enviadas.`,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Función para enviar notificación via FCM
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
) {
  const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID")!;
  const firebaseClientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
  const firebasePrivateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, "\n");

  // Obtener token de acceso
  const jwt = await getAccessToken(firebaseClientEmail, firebasePrivateKey);

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: { title, body },
          data,
          android: {
            priority: "high",
            notification: {
              channel_id: "barberia_appointments_channel",
              icon: "ic_launcher",
              color: "#B8860B",
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("FCM Error:", errorText);
    throw new Error(`FCM notification failed: ${errorText}`);
  }

  return response.json();
}

// Obtener JWT para Firebase Admin SDK
async function getAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const header = { alg: "RS256", typ: "JWT" };
  const encode = (str: string) =>
    btoa(JSON.stringify(str)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signature = await crypto.subtle.importKey(
    "pkcs8",
    strToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  ).then((key) =>
    crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      strToArrayBuffer(`${encode(header)}.${encode(payload)}`)
    )
  ).then((sig) =>
    btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
  );

  const jwt = `${encode(header)}.${encode(payload)}.${signature}`;

  // Intercambiar por access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function strToArrayBuffer(str: string): ArrayBuffer {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}
