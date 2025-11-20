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
      extraData,
      resultCode,
      transId,
      signature
    } = data;

    // 1. ENV
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;

    // 2. ĐÚNG RAW HASH CHUẨN CỦA MOMO AIO V2
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&requestId=${requestId}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSig = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    if (expectedSig !== signature) {
      return NextResponse.json(
        { message: "Invalid signature", resultCode: -1 },
        { status: 200 }
      );
    }

    // 3. SUPABASE ADMIN
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Update DB NẾU THANH TOÁN THÀNH CÔNG
    if (resultCode == 0) {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", orderId);

      if (error) {
        console.error("Supabase error:", error);
        return NextResponse.json(
          { message: "Database update failed", resultCode: 1 },
          { status: 200 }
        );
      }
    }

    // 5. TRẢ LỜI CHUẨN MOMO YÊU CẦU
    return NextResponse.json(
      { message: "success", resultCode: 0 },
      { status: 200 }
    );

  } catch (err) {
    console.error("IPN Error:", err);
    return NextResponse.json(
      { message: "Server error", resultCode: 5 },
      { status: 200 }
    );
  }
}
