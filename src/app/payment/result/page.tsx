"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function PaymentResult() {
  const q = useSearchParams();
const orderId = q?.get("vnp_TxnRef") || q?.get("orderId") || "";
  const [status, setStatus] = useState("Đang kiểm tra…");

  useEffect(() => {
    const run = async () => {
      if (!orderId) return;
      await new Promise(resolve => setTimeout(resolve, 1500));
      const { data } = await supabase
        .from("invoices")
        .select("status, amount, plan_id")
        .eq("id", orderId)
        .maybeSingle();
      setStatus(data?.status ?? "Không tìm thấy hoá đơn");
    };
    run();
  }, [orderId]);

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Kết quả thanh toán</h1>
      <p className="mb-2">Mã hoá đơn: <b>{orderId || "—"}</b></p>
      <p className="mb-6">Trạng thái: <b>{status}</b></p>
      <Link href="/" className="underline">Về trang chủ</Link>
    </div>
  );
}
