// Sidebar component: src/components/admin/AdminSidebar.tsx
import Link from "next/link";

export default function AdminSidebar() {
  return (
    <aside className="w-64 h-screen bg-white shadow-lg p-6 fixed left-0 top-0">
      <h1 className="text-2xl font-bold mb-6">PowerFit Admin</h1>
      <nav className="space-y-4">
        <Link href="/admin/dashboard" className="block hover:text-blue-600">Dashboard</Link>
        <Link href="/admin/users" className="block hover:text-blue-600">Users</Link>
        <Link href="/admin/invoices" className="block hover:text-blue-600">Invoices</Link>
        <Link href="/admin/subscriptions" className="block hover:text-blue-600">Subscriptions</Link>
        <Link href="/admin/plans" className="block hover:text-blue-600">Plans</Link>
      </nav>
    </aside>
  );
}



