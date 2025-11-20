// File: src/app/api/momo/ipn/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = data;

    // 1. Lấy các Key từ biến môi trường
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;

    // 2. Tạo chữ ký để xác thực (Bắt buộc đúng thứ tự)
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const generatedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    if (generatedSignature !== signature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
    }

    // 3. KHỞI TẠO SUPABASE ADMIN (Fix lỗi 500)
    // Chúng ta tạo một client riêng với quyền Service Role để có thể update database
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Xử lý kết quả
    if (resultCode == 0) {
      // Cập nhật trạng thái đơn hàng
      const { error } = await supabaseAdmin
        .from("invoices")
        .update({
          status: "paid",
        })
        .eq("id", orderId);

      if (error) {
        console.error("Supabase Admin Update Error:", error);
        return NextResponse.json(
          { message: "Database update failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ message: "IPN received" }, { status: 204 });
  } catch (error) {
    console.error("IPN Handler Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}