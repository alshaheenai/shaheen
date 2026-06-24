export const metadata = { title: "سياسة الخصوصية" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">سياسة الخصوصية</h1>
      <div className="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">ما نجمعه:</strong> بريدك الإلكتروني عند اشتراكك في النشرة.
        </p>
        <p>
          <strong className="text-foreground">كيف نستخدمه:</strong> لإرسال النشرة اليومية فقط. لا نبيع بياناتك ولا
          نشاركها مع أي جهة تسويقية.
        </p>
        <p>
          <strong className="text-foreground">تأكيد مزدوج:</strong> نرسل رابط تأكيد لبريدك قبل أي إرسال، فلا أحد
          يُشترك دون موافقته.
        </p>
        <p>
          <strong className="text-foreground">إلغاء الاشتراك:</strong> بنقرة واحدة في أي وقت، من رابط أسفل كل رسالة.
        </p>
        <p>نحفظ بياناتك بأمان ولا نستخدمها لغير ما ذُكر. قد نحدّث هذي السياسة وننشر أي تغيير هنا.</p>
        <p>
          <strong className="text-foreground">أسئلة الخصوصية:</strong>{" "}
          <a href="mailto:contact@alshaheenai.com" className="text-foreground underline">
            contact@alshaheenai.com
          </a>
        </p>
      </div>
    </main>
  );
}
