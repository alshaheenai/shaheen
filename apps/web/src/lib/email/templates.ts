// Inline-styled RTL Arabic email templates (email clients ignore external CSS).
import type { IssueBody } from "@/lib/pipeline/types";

function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Double opt-in confirmation email.
export function confirmationEmailHtml(args: {
  brandName: string;
  confirmUrl: string;
  accent?: string;
}): { subject: string; html: string } {
  const { brandName, confirmUrl, accent = "#C8932A" } = args;
  const subject = `أكّد اشتراكك في نشرة ${brandName}`;
  const name = esc(brandName);
  const url = esc(confirmUrl);
  const gold = esc(accent);
  const navy = "#0C2340";
  const cream = "#EFE9DA";
  const font = "'Segoe UI', Tahoma, Arial, sans-serif";

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${cream};">أكّد بريدك لتبدأ باستلام نشرة ${name}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7dfce;box-shadow:0 10px 32px rgba(12,35,64,0.12);">
          <!-- header -->
          <tr>
            <td align="center" style="background:${navy};padding:38px 24px 30px;">
              <div style="font-family:${font};font-size:34px;line-height:1.1;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${name} <span style="color:${gold};">🦅</span></div>
              <div style="font-family:${font};font-size:12px;color:${gold};margin-top:10px;letter-spacing:2px;">نشرة الذكاء الاصطناعي لروّاد الأعمال</div>
            </td>
          </tr>
          <tr><td style="height:4px;background:${gold};font-size:0;line-height:0;">&nbsp;</td></tr>
          <!-- body -->
          <tr>
            <td dir="rtl" style="padding:38px 32px 12px;font-family:${font};color:${navy};text-align:center;">
              <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:${navy};">أهلاً بك في سرب ${name}</h1>
              <p style="margin:0 0 30px;font-size:16px;line-height:1.9;color:#3a4757;">شكراً لانضمامك لسرب ${name} — أكّد بريدك لتبدأ باستلام النشرة.</p>
              <a href="${url}" style="display:inline-block;background:${gold};padding:15px 40px;font-family:${font};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">تأكيد الاشتراك</a>
            </td>
          </tr>
          <!-- fallback link -->
          <tr>
            <td dir="rtl" style="padding:26px 32px 32px;font-family:${font};text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.8;color:#8a8475;">إن لم يعمل الزر، انسخ هذا الرابط في المتصفح:<br><span style="color:#1E6FB8;word-break:break-all;">${url}</span></p>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td align="center" style="background:${cream};padding:22px 24px;border-top:1px solid #e7dfce;font-family:${font};">
              <p style="margin:0;font-size:12px;line-height:1.7;color:#8a8475;">إن لم تطلب هذا الاشتراك، تجاهل الرسالة.</p>
              <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:${navy};">${name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

// Full daily-issue newsletter email. Brand identity, RTL, inline CSS, responsive.
export function issueEmailHtml(args: {
  brandName: string;
  issue: { title: string | null; intro?: string | null; body: IssueBody };
  webUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const { brandName, issue, webUrl, unsubscribeUrl } = args;
  const name = esc(brandName);
  const web = esc(webUrl);
  const unsub = esc(unsubscribeUrl);
  const navy = "#0C2340";
  const cream = "#EFE9DA";
  const gold = "#C8932A";
  const font = "'Segoe UI', Tahoma, Arial, sans-serif";
  const b = issue.body ?? ({} as IssueBody);
  const title = issue.title?.trim() || `نشرة ${brandName}`;
  const subject = title;

  const h2 = (t: string) =>
    `<h2 style="margin:30px 0 12px;font-size:18px;font-weight:800;color:${navy};border-bottom:2px solid ${gold};padding-bottom:6px;">${t}</h2>`;

  const tldr =
    b.tldr_bullets?.length
      ? `${h2("👁️ نظرة الشاهين")}<ul style="margin:0;padding:0 18px 0 0;color:#3a4757;font-size:15px;line-height:1.9;">${b.tldr_bullets
          .map((x) => `<li style="margin:0 0 6px;">${esc(x)}</li>`)
          .join("")}</ul>`
      : "";

  const m = b.main;
  const para = (t?: string | null) =>
    t ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.9;color:#3a4757;">${esc(t)}</p>` : "";
  const main = m
    ? `${h2("⚡️ الانقضاضة")}<h3 style="margin:0 0 12px;font-size:17px;font-weight:700;color:${navy};">${esc(m.title)}</h3>${para(m.what)}${para(m.why)}${para(m.how)}${
        m.our_take
          ? `<div style="margin:14px 0 0;background:#f6efda;border-right:4px solid ${gold};border-radius:8px;padding:14px 16px;font-size:15px;line-height:1.9;color:${navy};"><strong>بعين الشاهين:</strong> ${esc(m.our_take)}</div>`
          : ""
      }`
    : "";

  const roundup =
    b.roundup?.length
      ? `${h2("🪶 رفّة جناح")}<ul style="margin:0;padding:0 18px 0 0;color:#3a4757;font-size:15px;line-height:1.9;">${b.roundup
          .map(
            (r) =>
              `<li style="margin:0 0 10px;"><strong style="color:${navy};">${esc(r.title)}</strong>${r.blurb ? ` — ${esc(r.blurb)}` : ""}</li>`
          )
          .join("")}</ul>`
      : "";

  const tools =
    b.tools?.length
      ? `${h2("🛠️ عُدّة الشاهين")}<ul style="margin:0;padding:0 18px 0 0;color:#3a4757;font-size:15px;line-height:1.9;">${b.tools
          .map(
            (t) =>
              `<li style="margin:0 0 10px;"><strong style="color:${navy};">${esc(t.name)}</strong>${t.blurb ? ` — ${esc(t.blurb)}` : ""}</li>`
          )
          .join("")}</ul>`
      : "";

  const intro = issue.intro?.trim()
    ? `<p style="margin:0 0 8px;font-size:16px;line-height:1.9;color:#3a4757;">${esc(issue.intro)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${cream};">${esc(title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7dfce;box-shadow:0 10px 32px rgba(12,35,64,0.12);">
          <tr>
            <td align="center" style="background:${navy};padding:34px 24px 26px;">
              <div style="font-family:${font};font-size:30px;line-height:1.1;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${name} <span style="color:${gold};">🦅</span></div>
              <div style="font-family:${font};font-size:12px;color:${gold};margin-top:9px;letter-spacing:2px;">نشرة الذكاء الاصطناعي لروّاد الأعمال</div>
            </td>
          </tr>
          <tr><td style="height:4px;background:${gold};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td dir="rtl" style="padding:34px 32px 8px;font-family:${font};color:${navy};text-align:right;">
              <h1 style="margin:0 0 14px;font-size:24px;font-weight:800;color:${navy};line-height:1.4;">${esc(title)}</h1>
              ${intro}
              ${tldr}
              ${main}
              ${roundup}
              ${tools}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 32px 36px;font-family:${font};">
              <a href="${web}" style="display:inline-block;background:${gold};padding:15px 40px;font-family:${font};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">اقرأ على الويب</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:${cream};padding:22px 24px;border-top:1px solid #e7dfce;font-family:${font};">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:#8a8475;">وصلتك هذه النشرة لأنك مشترك في ${name}. <a href="${unsub}" style="color:#1E6FB8;">إلغاء الاشتراك</a></p>
              <p style="margin:0;font-size:13px;font-weight:700;color:${navy};">${name} 🦅</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
