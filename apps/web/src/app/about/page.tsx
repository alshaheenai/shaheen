export const metadata = { title: "من نحن" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">من نحن</h1>
      <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
        <p>
          «الشاهين» نشرة يومية عربية تربط الذكاء الاصطناعي بريادة الأعمال في الخليج. هدفنا أن تصلك كل صباح
          أدوات وفرص وأفكار عملية بالذكاء الاصطناعي تساعدك تبني مشروعك أو تنمّيه — مبيعات، تسويق، إنتاجية،
          انتشار — بميزانية وفريق محدودين.
        </p>
        <p>
          نختار من ضجيج الأخبار ما تقدر تطبّقه فعلاً، ونترك أخبار الشركات الكبرى وصفقاتها للمستثمرين. لكل خبر
          نجيب: «ليش يهمك؟» و«كيف تطبّقه؟».
        </p>
        <p>
          الشاهين صقر يرصد من عُلوّ وينقضّ على المفيد. أقسامنا: نظرة الشاهين · الانقضاضة · بعين الشاهين · رفّة
          جناح · عُدّة الشاهين.
        </p>
        <p>
          للتواصل:{" "}
          <a href="mailto:contact@alshaheenai.com" className="text-foreground underline">
            contact@alshaheenai.com
          </a>
        </p>
      </div>
    </main>
  );
}
