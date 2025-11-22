export const runtime = "nodejs"; 
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    console.log("🔥 MoMo IPN HIT");

    const data = await request.json();
    console.log("📩 JSON IPN:", data);

    const {
      partnerCode,
      requestId,
      orderId,
      orderInfo,
      orderType,
      transId,
      amount,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = data;

    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;

    // Build raw signature đúng chuẩn MoMo
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    console.log("🔍 LOCAL RAW:", rawSignature);

    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    console.log("EXPECTED:", expectedSignature);
    console.log("CLIENT SENT:", signature);

    if (expectedSignature !== signature) {
      console.log("❌ Chữ ký KHÔNG KHỚP!");
      return NextResponse.json(
        { resultCode: -1, message: "Invalid signature" },
        { status: 200 }
      );
    }

    console.log("✅ Chữ ký hợp lệ!");

    const supabase = supabaseServer;

    // ❗ Chỉ update nếu thanh toán thành công
    if (String(resultCode) === "0") {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          transaction_id: transId,
          method: "MOMO",
          payment_date: new Date().toISOString(),
          payload: data,
        })
        .eq("id", orderId);

      if (error) {
        console.error("❌ DB ERROR:", error);
        return NextResponse.json(
          { resultCode: 1, message: "DB update error" },
          { status: 200 }
        );
      }
    } else {
      // ❗ Trường hợp thanh toán FAILED
      await supabase
        .from("invoices")
        .update({
          status: "failed",
          method: "MOMO",
          payload: data,
        })
        .eq("id", orderId);
    }

    console.log("🔥 Hoàn tất cập nhật đơn:", orderId);
    return NextResponse.json(
      { resultCode: 0, message: "Confirm success" },
      { status: 200 }
    );

  } catch (err) {
    console.error("💀 MoMo IPN ERROR:", err);
    return NextResponse.json(
      { resultCode: 1, message: "Server error" },
      { status: 200 }
    );
  }
}
