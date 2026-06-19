import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBrandName } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const brandName = await getBrandName();

  if (!isAdmin) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold">غير مصرّح</h1>
          <p className="text-sm text-muted-foreground">
            حسابك مسجّل دخول لكنه ليس ضمن قائمة المدراء. تواصل مع صاحب المشروع
            لإضافة بريدك.
          </p>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              تسجيل الخروج
            </Button>
          </form>
        </div>
      </main>
    );
  }

  const nav = [
    { href: "/admin", label: "الرئيسية" },
    { href: "/admin/issues", label: "النشرات" },
    { href: "/admin/sources", label: "المصادر" },
    { href: "/admin/raw-feed", label: "المحتوى الخام" },
    { href: "/admin/runs", label: "التشغيلات والتوكنات" },
    { href: "/admin/models", label: "النماذج" },
    { href: "/admin/brand", label: "الهوية والنبرة" },
  ];

  return (
    <div className="flex min-h-full flex-1">
      <aside className="w-60 shrink-0 border-l bg-sidebar p-4">
        <div className="mb-6 px-2 text-lg font-bold">{brandName}</div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post" className="mt-6">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            تسجيل الخروج
          </Button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
