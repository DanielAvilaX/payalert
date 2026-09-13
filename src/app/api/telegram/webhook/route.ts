import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Telegram Update payload - only the fields we use.
type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { username?: string };
    text?: string;
  };
};

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const update: TelegramUpdate = await request.json();
  const message = update.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  // Anything that isn't the deep link used to get silence, which reads as a
  // broken bot to anyone who opens the chat and says hello - or who taps
  // the bot's own "Start" button, since that sends a bare "/start".
  if (!message.text.startsWith("/start ")) {
    await sendTelegramMessage(
      message.chat.id,
      "Soy el bot de PayAlert: te aviso aquí cuando se acerque la fecha de tus pagos.\n\n" +
        "Para conectar tu cuenta, entra a PayAlert, ve a <b>Configuración</b> y toca " +
        "<b>Generar enlace de conexión</b>. Ese enlace te trae de vuelta acá y deja todo listo."
    );
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
    "✅ Tu cuenta de PayAlert quedó conectada. Te avisaré aquí de tus próximos pagos."
  );

  return NextResponse.json({ ok: true });
}
