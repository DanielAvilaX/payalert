# PayAlert

Recordatorios de pago por Telegram. Next.js (App Router) + Supabase (Postgres + Auth) + Vercel Cron.

## Stack

- **Next.js 16** (App Router, Server Actions) desplegado en Vercel.
- **Supabase**: base de datos Postgres, Auth (email + contraseña), Row Level Security.
- **Telegram Bot API**: cada usuario vincula su chat vía deep link (`/start <token>`); un cron diario revisa pagos próximos a vencer y envía los recordatorios.

## Setup local

1. **Dependencias**

   ```bash
   npm install
   ```

2. **Base de datos**: en el SQL Editor de tu proyecto Supabase, ejecuta [`supabase/schema.sql`](./supabase/schema.sql). Crea las tablas `payments`, `telegram_connections`, `telegram_link_tokens`, `notification_log` con RLS habilitado.

3. **Variables de entorno**: copia `.env.example` a `.env.local` y completa:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings > API en Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY` — misma pantalla, clave `service_role`/`secret`. Nunca la expongas al cliente.
   - `TELEGRAM_BOT_TOKEN` — el que te da @BotFather al crear el bot.
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username del bot sin el `@`.
   - `TELEGRAM_WEBHOOK_SECRET` y `CRON_SECRET` — genera cada uno con `openssl rand -hex 32`.

4. **Confirmación de email**: por defecto Supabase Auth exige confirmar el correo antes de crear sesión. Para pruebas rápidas en local puedes desactivarlo en Authentication > Providers > Email > "Confirm email", o revisar el correo de confirmación que Supabase envía.

5. **Correr en local**

   ```bash
   npm run dev
   ```

## Conectar el bot de Telegram

El webhook de Telegram necesita una URL pública HTTPS, así que este paso se hace después del primer deploy (o con un túnel como ngrok si quieres probar en local).

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<tu-dominio>.vercel.app/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Verifica con `getWebhookInfo`:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Deploy en Vercel

1. Importa el repo en Vercel y agrega las mismas variables de entorno del paso 3 (incluyendo `NEXT_PUBLIC_SITE_URL` con el dominio real).
2. El cron definido en [`vercel.json`](./vercel.json) corre todos los días a las 13:00 UTC (Vercel Cron siempre usa UTC; ajusta la hora según tu zona horaria). El plan Hobby permite como máximo una ejecución diaria por cron job.
3. Corre `setWebhook` (paso anterior) apuntando al dominio de producción.

## Cómo funciona el recordatorio

- Cada pago tiene `remind_days_before` (aviso "próximo a vencer"), y automáticamente se avisa el día que vence y si queda vencido sin marcarse como pagado.
- `notification_log` evita reenviar el mismo aviso más de una vez por fecha de vencimiento.
- Al marcar un pago recurrente como pagado, `due_date` avanza automáticamente al siguiente ciclo (semanal/mensual/anual) en vez de desaparecer.
