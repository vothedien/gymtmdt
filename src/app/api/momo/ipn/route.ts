// File: src/app/api/momo/ipn/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // phải dùng SERVICE KEY mới update được
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("🔥 MoMo IPN Received:", body);

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

    // === 1. Verify Signature ===
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

    if (signature !== computedSignature) {
      console.error("❌ MoMo Signature Invalid");
      return NextResponse.json(
        {
          partnerCode,
          requestId,
          orderId,
          resultCode: 11,
          message: "invalid signature",
        },
        { status: 200 } // MoMo KHÔNG CHO trả 400
      );
    }

    // === 2. Update invoices ===
    const success = resultCode === 0;

    const { error } = await supabase
      .from("invoices")
      .update({
        status: success ? "paid" : "failed",
        method: "momo",
        transaction_id: transId,
        payload: body,
        payment_date: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("❌ Supabase Update Error:", error);
      return NextResponse.json(
        {
          partnerCode,
          requestId,
          orderId,
          resultCode: 99,
          message: "database error",
        },
        { status: 200 }
      );
    }

    console.log("✅ Invoice Updated:", orderId);

    // === 3. Response MoMo format ===
    return NextResponse.json(
      {
        partnerCode,
        requestId,
        orderId,
        resultCode: 0,
        message: "success",
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("💥 MoMo IPN ERROR:", err);

    return NextResponse.json(
      { resultCode: 99, message: "server error" },
      { status: 200 }
    );
  }
}
