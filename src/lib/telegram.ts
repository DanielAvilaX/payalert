const TELEGRAM_API = "https://api.telegram.org";

/** A row of inline buttons attached under a message. */
export type InlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };

async function callTelegram(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram ${method} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  buttons?: InlineButton[][]
) {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(buttons?.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

/**
 * Telegram shows a spinner on the tapped button until this is called, so it
 * has to run on every callback - including the ones that fail - or the
 * button just looks stuck.
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: false } : {}),
  });
}

/**
 * Rewrites the original reminder in place once it's been acted on, so the
 * chat history reads as a record of what happened rather than leaving a
 * stale "vence hoy" with a live button under it.
 */
export async function editMessageText(chatId: number, messageId: number, text: string) {
  await callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  });
}

export function telegramConnectUrl(token: string) {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  return `https://t.me/${username}?start=${token}`;
}
