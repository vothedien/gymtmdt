import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sortObject(obj: Record<string, string>) {
  const sorted: Record<string, string> = {};
  Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
  return sorted;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => (rawParams[key] = value));

  const secureHash = rawParams["vnp_SecureHash"];
  const vnp_TxnRef = rawParams["vnp_TxnRef"];
  const vnp_Amount = rawParams["vnp_Amount"];
  const rspCode = rawParams["vnp_ResponseCode"];

  delete rawParams["vnp_SecureHash"];
  delete rawParams["vnp_SecureHashType"];

  const secret = process.env.VNP_HASH_SECRET!;

  const sorted = sortObject(rawParams);

  // ❗ Không được encode URI
  const signData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const check = crypto
    .createHmac("sha512", secret)
    .update(signData, "utf-8")
    .digest("hex");

  if (secureHash !== check) {
    return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
  }

  // Lấy đơn hàng
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", vnp_TxnRef)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ RspCode: "01", Message: "Order not found" });
  }

  // Check amount
  const vnpAmountNumber = Number(vnp_Amount) / 100;

  if (Number(invoice.amount) !== vnpAmountNumber) {
    return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
  }

  // Đã confirm rồi
  if (invoice.status !== "pending") {
    return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
  }

  const newStatus = rspCode === "00" ? "paid" : "failed";

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: newStatus,
      transaction_id: rawParams["vnp_TransactionNo"],
      method: "VNPAY",
    })
    .eq("id", vnp_TxnRef);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ RspCode: "99", Message: "Database Error" });
  }

  return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
}
