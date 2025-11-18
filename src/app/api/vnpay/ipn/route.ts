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

// ❗ IPN = POST !!! 
export async function POST(req: Request) {
  const body = await req.formData(); // VNPay gửi form-encoded

  const rawParams: Record<string, string> = {};
  body.forEach((v, k) => (rawParams[k] = String(v)));

  const secureHash = rawParams["vnp_SecureHash"];
  const secret = process.env.VNP_HASH_SECRET!;
  const vnp_TxnRef = rawParams["vnp_TxnRef"];

  delete rawParams["vnp_SecureHash"];
  delete rawParams["vnp_SecureHashType"];

  const sorted = sortObject(rawParams);

  const signData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const check = crypto
    .createHmac("sha512", secret)
    .update(signData)
    .digest("hex");

  if (secureHash !== check) {
    return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
  }

  const success =
    rawParams["vnp_ResponseCode"] === "00" &&
    rawParams["vnp_TransactionStatus"] === "00";

  const newStatus = success ? "paid" : "failed";

  const { error } = await supabase
    .from("invoices")
    .update({
      status: newStatus,
      transaction_id: rawParams["vnp_TransactionNo"],
      method: "VNPAY",
    })
    .eq("id", vnp_TxnRef);

  if (error) {
    return NextResponse.json({ RspCode: "99", Message: "Database Error" });
  }

  // 👇 TRẢ VỀ CHO VNPAY — KHÔNG REDIRECT
  return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
}
