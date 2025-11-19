import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";


function sortObject(obj: Record<string, string>) {
  const sorted: Record<string, string> = {};
  Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
  return sorted;
}

// ✅ VNPAY IPN sử dụng method GET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      // Ưu tiên service role key để IPN có thể cập nhật trạng thái hoá đơn (rơi về anon key nếu chưa cấu hình)
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

  // 1. Lấy dữ liệu từ Query Params
  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const secureHash = rawParams["vnp_SecureHash"];
  const vnp_TxnRef = rawParams["vnp_TxnRef"]; // Mã đơn hàng
  const vnp_Amount = rawParams["vnp_Amount"]; // Số tiền (đã nhân 100)
  const rspCode = rawParams["vnp_ResponseCode"];

  // 2. Xóa các params không dùng để ký
  delete rawParams["vnp_SecureHash"];
  delete rawParams["vnp_SecureHashType"];

  // 3. Kiểm tra Checksum (Chữ ký bảo mật)
  const secret = process.env.VNP_HASH_SECRET!;
  const sorted = sortObject(rawParams);
  
  const signData = Object.entries(sorted)
  // Phải sử dụng hàm mã hóa để đảm bảo chuỗi ký khớp với chuỗi VNPAY đã tạo
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`) 
  .join("&"); 

const check = crypto
  .createHmac("sha512", secret)
  // LƯU Ý: Nếu dùng encodeURIComponent, cần đảm bảo bạn không encode double (encode lại lần nữa)
  .update(Buffer.from(signData, 'utf-8')) 
  .digest("hex");
  if (secureHash !== check) {
    console.error("❌ VNPAY IPN: Checksum failed");
    return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
  }

  // 4. Lấy thông tin đơn hàng từ DB
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", vnp_TxnRef)
    .single();

  // Kịch bản 1: Đơn hàng không tồn tại
  if (fetchError || !invoice) {
    return NextResponse.json({ RspCode: "01", Message: "Order not found" });
  }

  // Kịch bản 2: Check số tiền (Quan trọng để tránh hack sửa giá)
  // Lưu ý: vnp_Amount là string, đơn vị VNĐ * 100. Ví dụ 10000 VNĐ -> 1000000
  const vnpAmountNumber = Number(vnp_Amount) / 100; 
  if (vnpAmountNumber !== invoice.amount) { 
     // invoice.amount là cột số tiền trong DB của bạn
     return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
  }

  // Kịch bản 3: Đơn hàng đã được confirm rồi -> Không update lại
  if (invoice.status !== "pending") { // Giả sử trạng thái chờ là 'pending'
     return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
  }

  // 5. Xử lý kết quả giao dịch
  let updateStatus = "failed";
  if (rspCode === "00") {
    updateStatus = "paid";
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: updateStatus,
      transaction_id: rawParams["vnp_TransactionNo"],
      method: "VNPAY",
      //payment_date: new Date().toISOString(), // Nên lưu thời gian thanh toán
    })
    .eq("id", vnp_TxnRef);

  if (updateError) {
    console.error("❌ SUPABASE UPDATE FAILED:", updateError);
    return NextResponse.json({ RspCode: "99", Message: "Database Error" });
  }

  // ✅ Trả về đúng định dạng VNPAY yêu cầu
  return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
}