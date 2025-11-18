import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";  // Nếu bạn muốn update invoices

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("MoMo IPN Data:", body);

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
      extraData,
      signature
    } = body;

    // --- 1. Lấy key env ---
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;

    // --- 2. Tạo raw hash để check signature ---
    const rawHash = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${body.responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const checkSignature = crypto.createHmac("sha256", secretKey)
      .update(rawHash)
      .digest("hex");

    // --- 3. Kiểm tra chữ ký ---
    if (checkSignature !== signature) {
      console.error("MoMo Signature mismatch");
      return NextResponse.json(
        { message: "Signature invalid", resultCode: 11 },
        { status: 400 }
      );
    }

    // --- 4. Xử lý giao dịch ---
    if (resultCode === 0) {
      console.log(`MoMo Payment Success: ${orderId}`);

      // OPTIONAL: Update Supabase nếu bạn dùng bảng invoices
      await supabase.from("invoices")
        .update({
          status: "PAID",
          transaction_id: transId,
          method: "MOMO",
          payload: body
        })
        .eq("id", orderId);
    } else {
      console.log(`MoMo Payment Failed: ${orderId}`);
      await supabase.from("invoices")
        .update({
          status: "FAILED",
          payload: body
        })
        .eq("id", orderId);
    }

    // --- 5. Phản hồi lại MoMo ---
    return NextResponse.json({
      message: "IPN received",
      resultCode: 0
    });

  } catch (error) {
    console.error("MoMo IPN ERROR:", error);

    return NextResponse.json(
      { message: "Server error", resultCode: 99 },
      { status: 500 }
    );
  }
}
