// Inline-styled RTL Arabic email templates (email clients ignore external CSS).

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
            <td dir="rtl" style="padding:38px 32px 12px;font-family:${font};color:${navy};text-align:right;">
              <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:${navy};">أهلاً بك في سرب ${name}</h1>
              <p style="margin:0 0 30px;font-size:16px;line-height:1.9;color:#3a4757;">شكراً لانضمامك لسرب ${name} — أكّد بريدك لتبدأ باستلام النشرة.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" align="right">
                <tr>
                  <td style="border-radius:10px;background:${gold};">
                    <a href="${url}" style="display:inline-block;padding:15px 40px;font-family:${font};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">تأكيد الاشتراك</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- fallback link -->
          <tr>
            <td dir="rtl" style="padding:26px 32px 32px;font-family:${font};text-align:right;">
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
