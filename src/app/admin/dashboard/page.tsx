"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard");
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-lg font-semibold">
        Đang tải dữ liệu dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-lg text-red-600 font-semibold">
        Không thể tải dữ liệu dashboard.
      </div>
    );
  }

  const { users, revenue, plans } = data;

  return (
    <div className="p-6 space-y-8">

      {/* TITLE */}
      <div>
        <h1 className="text-3xl font-bold">PowerFit Dashboard</h1>
        <p className="text-slate-500 mt-1">Tổng quan hoạt động hệ thống</p>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Tổng hội viên */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Tổng hội viên</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{users.totalUsers}</div>
            <p className="text-sm text-slate-500 mt-1">auth.users</p>
          </CardContent>
        </Card>

        {/* Hội viên mới tháng này */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Hội viên mới (tháng này)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{users.newUsersThisMonth}</div>
            <p className="text-sm text-slate-500 mt-1">Tính từ đầu tháng</p>
          </CardContent>
        </Card>

        {/* Doanh thu */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {revenue.totalRevenue.toLocaleString()}đ
            </div>
            <p className="text-sm text-slate-500 mt-1">MoMo + VNPAY</p>
          </CardContent>
        </Card>

      </div>

      {/* TRANSACTION STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Tổng giao dịch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {revenue.totalTransactions}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Giao dịch thành công</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {revenue.successfulTransactions}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Tỉ lệ thành công</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{revenue.successRate}%</div>
          </CardContent>
        </Card>

      </div>

      {/* POPULAR PLANS */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Gói tập phổ biến</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {plans.popularPlans.map((p: any) => (
            <Card key={p.plan_id} className="shadow-md">
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{p.count}</div>
                <p className="text-sm text-slate-500 mt-1">
                  Người đang dùng gói này
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
