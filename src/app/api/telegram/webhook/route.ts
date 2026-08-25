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
  if (!message?.text?.startsWith("/start ")) {
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
