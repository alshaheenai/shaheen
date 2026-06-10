import { getBrand } from "@/lib/brand";
import { BrandForm } from "./brand-form";

export default async function BrandPage() {
  const brand = await getBrand();

  if (!brand) {
    return (
      <p className="text-sm text-destructive">
        لم يُعثر على صف الهوية. تأكد من تطبيق بذور قاعدة البيانات.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الهوية والنبرة</h1>
        <p className="text-muted-foreground">
          اسم المشروع وهويته التحريرية — تُعتمد في كل المخرجات.
        </p>
      </div>
      <BrandForm brand={brand} />
    </div>
  );
}
