import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  answerCallbackQuery,
  editMessageText,
  escapeHtml,
  sendTelegramMessage,
} from "@/lib/telegram";
import { settlePayment } from "@/lib/payments";
import { logActivity } from "@/lib/access";

// Telegram Update payload - only the fields we use.
type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
};

const HELP_TEXT =
  "Soy el bot de PayAlert: te aviso aquí cuando se acerque la fecha de tus pagos.\n\n" +
  "Para conectar tu cuenta, entra a PayAlert, ve a <b>Configuración</b> y toca " +
  "<b>Generar enlace de conexión</b>. Ese enlace te trae de vuelta acá y deja todo listo.";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const update: TelegramUpdate = await request.json();

  // Telegram redelivers any update we don't answer with a 2xx, and it keeps
  // redelivering. An internal failure here must not turn into an infinite
  // retry loop, so it's logged and acknowledged rather than thrown - the
  // writes underneath are idempotent either way.
  try {
    if (update.callback_query) return await handleCallback(update.callback_query);
    if (update.message) return await handleMessage(update.message);
  } catch (e) {
    console.error("telegram webhook", e);
  }
  return NextResponse.json({ ok: true });
}

/**
 * The "✅ Ya lo pagué" button under a reminder.
 *
 * callback_data comes from the client and can be forged, so the payment id
 * in it is never trusted on its own: the chat is resolved to its owning
 * account first, and the settle query is scoped to that user. A crafted
 * callback carrying someone else's payment id simply matches no row.
 */
async function handleCallback(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const chatId = callback.message?.chat.id;
  const [action, paymentId] = (callback.data ?? "").split(":");

  if (action !== "paid" || !paymentId || !chatId) {
    await answerCallbackQuery(callback.id);
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceRoleClient();

  const { data: connection } = await supabase
    .from("telegram_connections")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!connection) {
    await answerCallbackQuery(callback.id, "Esta conversación ya no está conectada.");
    return NextResponse.json({ ok: true });
  }

  const result = await settlePayment(supabase, connection.user_id, paymentId);

  if ("error" in result) {
    await answerCallbackQuery(callback.id, "No se pudo marcar. Intenta desde la app.");
    return NextResponse.json({ ok: true });
  }

  await answerCallbackQuery(callback.id, "¡Listo! Marcado como pagado.");

  // Settling from the chat is still somebody doing something: on a shared
  // payment the other person needs to be able to see who it was.
  await logActivity(supabase, {
    paymentId,
    paymentName: result.payment.name,
    actorId: connection.user_id,
    action: "paid",
    details: { amount: result.payment.amount, dueDate: result.payment.due_date },
    audience: result.audience,
  });

  // Rewrite the reminder so the chat doesn't keep a stale "vence hoy" with a
  // live button under it.
  await editMessageText(
    chatId,
    callback.message!.message_id,
    `✅ <b>${escapeHtml(result.payment.name)}</b> quedó marcado como pagado.${
      result.payment.amount_is_variable
        ? "\n\n<i>Este pago tiene monto variable: ajusta el valor real en la app para que el resumen del mes cuadre.</i>"
        : ""
    }`
  );

  return NextResponse.json({ ok: true });
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  if (!message.text) return NextResponse.json({ ok: true });

  // Anything that isn't the deep link used to get silence, which reads as a
  // broken bot to anyone who opens the chat and says hello - or who taps
  // the bot's own "Start" button, since that sends a bare "/start".
  if (!message.text.startsWith("/start ")) {
    await sendTelegramMessage(message.chat.id, HELP_TEXT);
    return NextResponse.json({ ok: true });
  }

  const token = message.text.slice("/start ".length).trim();
  const supabase = createServiceRoleClient();

  const { data: linkToken } = await supabase
    .from("telegram_link_tokens")
    .select("user_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!linkToken || linkToken.used_at || new Date(linkToken.expires_at) < new Date()) {
    await sendTelegramMessage(
      message.chat.id,
      "Este enlace ya no es válido. Genera uno nuevo desde PayAlert."
    );
    return NextResponse.json({ ok: true });
  }

  await supabase.from("telegram_connections").upsert({
    user_id: linkToken.user_id,
    chat_id: message.chat.id,
    telegram_username: message.from?.username ?? null,
  });

  await supabase
    .from("telegram_link_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  await sendTelegramMessage(
    message.chat.id,
    "✅ Tu cuenta de PayAlert quedó conectada. Te avisaré aquí de tus próximos pagos.\n\n" +
      "Cuando te llegue un recordatorio vas a poder marcarlo como pagado desde el mismo mensaje."
  );

  return NextResponse.json({ ok: true });
}
