import { getBrandName } from "@/lib/brand";

export default async function AdminHome() {
  const brandName = await getBrandName();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">لوحة تحكم {brandName}</h1>
      <p className="text-muted-foreground">
        مركز تشغيل المشروع. ابدأ بضبط الهوية والنبرة من القائمة الجانبية.
      </p>
    </div>
  );
}
