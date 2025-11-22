import { supabaseServer } from "@/lib/supabase-server";
export const runtime = "nodejs"; // bắt buộc — VNPAY không chạy trong edge

import { NextResponse } from "next/server";
import crypto from "crypto";

const supabase = supabaseServer;

// Hàm sort object theo key
function sortObject(obj: Record<string, string>) {
  const sorted: Record<string, string> = {};
  Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
  return sorted;
}

export async function GET(req: Request) {
  console.log("🔥 VNPAY IPN HIT");

  const { searchParams } = new URL(req.url);

  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => (rawParams[key] = value));

  console.log("Raw Params:", rawParams);

  const secureHash = rawParams["vnp_SecureHash"];
  const vnp_TxnRef = rawParams["vnp_TxnRef"];
  const vnp_Amount = rawParams["vnp_Amount"];
  const rspCode = rawParams["vnp_ResponseCode"];

  // Xoá chữ ký trước khi build hash
  delete rawParams["vnp_SecureHash"];
  delete rawParams["vnp_SecureHashType"];

  const secret = process.env.VNP_HASH_SECRET!;

  // Sort params
  const sorted = sortObject(rawParams);

  // Build sign data (KHÔNG encode)
  const signData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  console.log("Sign Data:", signData);

  // Hash
  const check = crypto
    .createHmac("sha512", secret)
    .update(signData, "utf-8")
    .digest("hex");

  console.log("Hash Check:", check);

  // Sai signature
  if (secureHash !== check) {
    console.log("❌ Wrong signature");
    return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
  }

  // Lấy hóa đơn
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", vnp_TxnRef)
    .single();

  console.log("Invoice:", invoice, "Error:", invoiceError);

  if (invoiceError || !invoice) {
    return NextResponse.json({ RspCode: "01", Message: "Order not found" });
  }

  // Check amount (VNPAY amount * 100)
  const vnpAmountNumber = Number(vnp_Amount) / 100;

  if (Number(invoice.amount) !== vnpAmountNumber) {
    return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
  }

  // Nếu đã xử lý rồi thì trả về 02
  if (invoice.status !== "pending") {
    console.log("⏳ Order already confirmed");
    return NextResponse.json({
      RspCode: "02",
      Message: "Order already confirmed",
    });
  }

  // Map trạng thái
  const newStatus = rspCode === "00" ? "paid" : "failed";

  // Update DB
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: newStatus,
      transaction_id: rawParams["vnp_TransactionNo"],
      method: "VNPAY",
      payment_date: new Date().toISOString(),
      payload: rawParams,
    })
    .eq("id", vnp_TxnRef);

  if (updateError) {
    console.log("❌ DB Error:", updateError);
    return NextResponse.json({ RspCode: "99", Message: "Database Error" });
  }

  console.log("✅ Update success");

  return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
}
