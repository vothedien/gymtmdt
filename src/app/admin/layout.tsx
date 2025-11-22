// Admin layout: src/app/admin/layout.tsx
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <AdminSidebar />
      <main className="ml-64 p-6 w-full min-h-screen bg-slate-50">{children}</main>
    </div>
  );
}
