
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    console.log("--- BẮT ĐẦU XỬ LÝ IPN ---");
    
    // 1. Kiểm tra biến môi trường có load được không
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("LỖI: Server chưa nhận được SUPABASE_SERVICE_ROLE_KEY. Hãy khởi động lại server!");
    }

    const data = await request.json();
    const { partnerCode, orderId, requestId, amount, orderInfo, orderType, transId, resultCode, message, payType, responseTime, extraData, signature } = data;

    // 2. Kiểm tra chữ ký
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const generatedSignature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    if (generatedSignature !== signature) {
      console.error("-> Lỗi: Sai chữ ký!");
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
    }

    // 3. Khởi tạo Supabase Admin
    console.log("-> Đang kết nối Supabase với quyền Admin...");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (resultCode == 0) {
      console.log(`-> Đang update trạng thái PAID cho đơn: ${orderId}`);
      const { error } = await supabaseAdmin
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", orderId);

      if (error) {
        console.error("-> LỖI UPDATE DB:", error); // <--- Nhìn vào Terminal để thấy lỗi này
        return NextResponse.json({ message: "DB Error: " + error.message }, { status: 500 });
      }
      console.log("-> UPDATE THÀNH CÔNG!");
    }

    return NextResponse.json({ message: "IPN received" }, { status: 200 });
  } catch (error: any) {
    // In lỗi chi tiết ra Terminal
    console.error("-> LỖI CHẾT NGƯỜI (CRASH):", error.message);
    return NextResponse.json({ message: "Crash: " + error.message }, { status: 500 });
  }
}