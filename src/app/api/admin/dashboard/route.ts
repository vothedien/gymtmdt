import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    // ============================
    // 1. Users
    // ============================
    const { data: userList } = await supabaseServer.auth.admin.listUsers();
    const users = userList?.users || [];

    const totalUsers = users.length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newUsersThisMonth = users.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (u: any) => new Date(u.created_at) >= startOfMonth
    ).length;

    // ============================
    // 2. Invoices
    // ============================
    const { data: invoicesRaw } = await supabaseServer
      .from("invoices")
      .select("*");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices: any[] = invoicesRaw || [];

    // Chuẩn hóa method + status về lowercase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedInvoices = invoices.map((inv: any) => ({
      ...inv,
      method: inv.method?.toLowerCase(),
      status: inv.status?.toLowerCase(),
    }));

    // Tổng giao dịch
    const totalTransactions = normalizedInvoices.length;

    // Giao dịch thành công = paid
    const successfulTransactions = normalizedInvoices.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inv: any) => inv.status === "paid"
    ).length;

    // % thành công
    const successRate =
      totalTransactions === 0
        ? 0
        : Math.round(
            (successfulTransactions / totalTransactions) * 100
          );

    // Tổng doanh thu
    const totalRevenue = normalizedInvoices
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((inv: any) => inv.status === "paid")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

    // Thống kê theo phương thức thanh toán
    const transactionsByMethod = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      momo: normalizedInvoices.filter((inv: any) => inv.method === "momo")
        .length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vnpay: normalizedInvoices.filter((inv: any) => inv.method === "vnpay")
        .length,
    };

    // ============================
    // 3. Plans + subscriptions
    // ============================
    const { data: subscriptionsRaw } = await supabaseServer
      .from("subscriptions")
      .select("*");

    const { data: plansRaw } = await supabaseServer
      .from("plans")
      .select("*");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptions: any[] = subscriptionsRaw || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plans: any[] = plansRaw || [];

    const popularPlans = plans.map((p) => ({
      plan_id: p.id,
      name: p.name,
      count: subscriptions.filter((s) => s.plan_id === p.id).length,
    }));

    // ============================
    // Return full dashboard
    // ============================
    return NextResponse.json({
      ok: true,
      data: {
        users: {
          totalUsers,
          newUsersThisMonth,
        },
        revenue: {
          totalRevenue,
          totalTransactions,
          successfulTransactions,
          successRate,
          transactionsByMethod,
        },
        plans: {
          popularPlans,
          totalSubscriptions: subscriptions.length,
        },
      },
    });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Dashboard API Error:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
