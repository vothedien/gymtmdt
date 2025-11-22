// Users page: src/app/admin/users/page.tsx
'use client';
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/users");
        const json = await res.json();
        setUsers(json.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6 text-lg">Đang tải danh sách...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-200 text-left">
                <th className="p-3">Email</th>
                <th className="p-3">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {users.map((u: any) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
