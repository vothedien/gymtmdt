export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    console.log("🔥 IPN HIT");

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
      signature
    } = data;

    // 🔥 KHÔNG LẤY accessKey TỪ data (LỖI)
    const accessKey = process.env.MOMO_ACCESS_KEY!;

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

    console.log("🔍 RAW LOCAL:", rawSignature);

    const expectedSignature = crypto
      .createHmac("sha256", process.env.MOMO_SECRET_KEY!)
      .update(rawSignature)
      .digest("hex");

    console.log("🔍 EXPECTED:", expectedSignature);
    console.log("🔍 MOMO SENT:", signature);

    if (expectedSignature !== signature) {
      console.error("❌ Sai chữ ký!");
      return NextResponse.json({ resultCode: -1, message: "Invalid signature" }, { status: 200 });
    }

    console.log("✅ SIGNATURE KHỚP!");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (String(resultCode) === "0") {
      await supabase
        .from("invoices")
        .update({
          status: "paid",
          transaction_id: transId,
          payment_date: new Date().toISOString(),
          payload: data
        })
        .eq("id", orderId);
    }

    return NextResponse.json({ resultCode: 0, message: "Confirm success" }, { status: 200 });

  } catch (err) {
    console.error("💀 IPN error:", err);
    return NextResponse.json({ resultCode: 1, message: "Server error" }, { status: 200 });
  }
}
