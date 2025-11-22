import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    // Lấy invoices status = paid
    const { data: invoices, error } = await supabaseServer
      .from("invoices")
      .select("*")
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Lấy danh sách user_id duy nhất
    const userIds = [...new Set(invoices.map((i) => i.user_id))];

    // Fetch email cho mỗi user
    const emailMap: Record<string, string> = {};

    const userPromises = userIds.map(async (id) => {
      const { data } = await supabaseServer.auth.admin.getUserById(id);
      emailMap[id] = data?.user?.email ?? "Unknown";
    });

    await Promise.all(userPromises);

    // Format lại kết quả
    const result = invoices.map((inv) => ({
      user_id: inv.user_id,
      email: emailMap[inv.user_id] || "Unknown",
      plan_id: inv.plan_id,
      status: inv.status,
      created_at: inv.created_at,
    }));

    return NextResponse.json({ ok: true, data: result });
  }// eslint-disable-next-line @typescript-eslint/no-explicit-any
   catch (err: any) {
    console.error("Subscriptions Error:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
