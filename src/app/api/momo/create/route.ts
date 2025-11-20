// File: src/app/api/momo/create/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    // === ENV ===
    const partnerCode = process.env.MOMO_PARTNER_CODE!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const endpoint = process.env.MOMO_ENDPOINT!;
    const redirectUrl = process.env.MOMO_REDIRECT_URL!;  // trang return
    const ipnUrl = process.env.MOMO_IPN_URL!;            // trang IPN

    // === Order info ===
    const orderId = `${partnerCode}-${Date.now()}`;
    const requestId = orderId;
    const requestType = "captureWallet"; // PHẢI DÙNG — ATM TEST KHÔNG GỬI IPN
    const orderInfo = "Thanh toán đơn hàng";
    const extraData = "";
    const lang = "vi";

    // === RAW SIGNATURE — PHẢI THEO ĐÚNG THỨ TỰ MỚI CHUẨN ===
    const rawHash =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    // === CREATE SIGNATURE ===
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawHash)
      .digest("hex");

    // === BODY REQUEST TO MOMO ===
    const requestBody = {
      partnerCode,
      partnerName: "MoMo Test",
      storeId: "GYMTMDT-STORE",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      lang,
      signature,
    };

    console.log("🔥 MoMo Create Payload:", requestBody);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    console.log("🔥 MoMo Response:", result);

    // === SUCCESS ===
    if (result?.payUrl) {
      return NextResponse.json({ url: result.payUrl });
    }

    // === ERROR FROM MOMO ===
    return NextResponse.json(
      { error: result.message || "Create MoMo payment failed" },
      { status: 500 }
    );
  } catch (err) {
    console.error("💥 MoMo Create ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
