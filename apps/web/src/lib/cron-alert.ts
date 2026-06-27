import "server-only";
import { tg, ADMIN_CHAT_ID } from "@/lib/telegram";

// Best-effort Telegram alert to the admin when a cron route fails.
// Never throws — it must not mask the original cron failure.
export async function alertCronFailure(job: string, error: unknown): Promise<void> {
  try {
    const msg = error instanceof Error ? error.message : String(error);
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID(),
      text: `🛑 فشل دورة ${job}:\n${msg.slice(0, 500)}`,
    });
  } catch {
    // swallow — alerting is best-effort
  }
}
