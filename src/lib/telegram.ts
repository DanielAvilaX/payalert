const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
  }
}

export function telegramConnectUrl(token: string) {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  return `https://t.me/${username}?start=${token}`;
}
