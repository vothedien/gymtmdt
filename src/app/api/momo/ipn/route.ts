import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Supabase server role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔥 MoMo IPN:", body);

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

    // 1. rawHash phải đúng thứ tự MoMo yêu cầu (tài liệu chính thức)
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;

    const rawHash =
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
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const computedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawHash)
      .digest("hex");

    if (computedSignature !== signature) {
      console.error("❌ MoMo Signature Invalid");
      return NextResponse.json({ message: "Invalid signature", resultCode: 11 });
    }

    // 2. Update DB
    const isSuccess = resultCode === 0;

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: isSuccess ? "paid" : "failed",
        method: "momo",
        transaction_id: transId,
        payload: body,
        payment_date: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("❌ Supabase Update Error:", updateError);
      return NextResponse.json({ message: "DB error", resultCode: 99 });
    }

    console.log("✅ Updated invoice:", orderId);

    return NextResponse.json({ message: "IPN received", resultCode: 0 });

  } catch (err) {
    console.error("💥 MoMo IPN Server Error:", err);
    return NextResponse.json({ message: "Server error", resultCode: 99 });
  }
}
