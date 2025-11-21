export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    console.log("🔥 IPN HIT!");

    // MoMo gửi dạng x-www-form-urlencoded
    const form = await request.formData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = Object.fromEntries(form);

    console.log("📩 Momo sent:", data);

    const {
      partnerCode,
      accessKey,
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
    } = data ;

    // Raw signature EXACT order from MoMo
    const rawSignature =
      `partnerCode=${partnerCode}` +
      `&accessKey=${accessKey ?? process.env.MOMO_ACCESS_KEY}` +
      `&requestId=${requestId}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&transId=${transId}` +
      `&amount=${amount}` +
      `&message=${message}` +
      `&localMessage=${message}` + // MoMo sometimes duplicates message
      `&responseTime=${responseTime}` +
      `&errorCode=${resultCode}` +
      `&payType=${payType}` +
      `&extraData=${extraData}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.MOMO_SECRET_KEY!)
      .update(rawSignature)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ Wrong signature!");
      return NextResponse.json(
        { message: "Invalid signature", resultCode: -1 },
        { status: 200 }
      );
    }

    console.log("✅ Signature OK → Updating DB...");

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (resultCode === "0" || resultCode === 0) {
      await db
        .from("invoices")
        .update({
          status: "paid",
          transaction_id: transId,
          payment_date: new Date().toISOString(),
          payload: data
        })
        .eq("id", orderId);
    }

    console.log("🎉 DB Updated!");

    return NextResponse.json(
      { message: "Confirm Success", resultCode: 0 },
      { status: 200 }
    );
  } catch (err) {
    console.error("💀 IPN error:", err);
    return NextResponse.json(
      { message: "Error", resultCode: 1 },
      { status: 200 }
    );
  }
}
