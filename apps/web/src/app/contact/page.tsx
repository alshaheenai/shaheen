export const metadata = { title: "تواصل" };

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">تواصل</h1>
      <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
        <p>يسعدنا تواصلك — اقتراح، ملاحظة، شراكة، أو استفسار.</p>
        <p>
          📧{" "}
          <a href="mailto:contact@alshaheenai.com" className="text-foreground underline">
            contact@alshaheenai.com
          </a>
        </p>
        <p className="text-sm">(حسابات التواصل قريباً.)</p>
      </div>
    </main>
  );
}
