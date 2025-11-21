// File: src/app/api/momo/create/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { amount, orderId: clientOrderId, orderInfo: clientOrderInfo } = await request.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const partnerCode = process.env.MOMO_PARTNER_CODE!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const endpoint = process.env.MOMO_ENDPOINT!;
    const redirectUrl = process.env.MOMO_REDIRECT_URL!;
    const ipnUrl = process.env.MOMO_IPN_URL!;

    console.log("🔗 ipnUrl:", ipnUrl);

    const orderInfo = clientOrderInfo || "Thanh toan don hang qua MoMo";
    const orderId = clientOrderId || partnerCode + Date.now();
    const requestId = orderId;

    const requestType = "payWithATM";

    const extraData = "";
    const lang = "vi";

    const rawHash =
      "accessKey=" + accessKey +
      "&amount=" + amount +
      "&extraData=" + extraData +
      "&ipnUrl=" + ipnUrl +
      "&orderId=" + orderId +
      "&orderInfo=" + orderInfo +
      "&partnerCode=" + partnerCode +
      "&redirectUrl=" + redirectUrl +
      "&requestId=" + requestId +
      "&requestType=" + requestType;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawHash)
      .digest("hex");

    const requestBody = {
      partnerCode,
      partnerName: "GymX",
      storeId: "GymX",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      extraData,
      requestType,
      signature,
    };

    // DEBUG LOG
    console.log("📤 SENT TO MOMO:", requestBody);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const jsonResult = await response.json();
    console.log("📥 MOMO RESPONSE:", jsonResult);

    if (jsonResult.payUrl) {
      return NextResponse.json({ payUrl: jsonResult.payUrl });
    }

    return NextResponse.json(
      { error: jsonResult.message || "Create failed" },
      { status: 500 }
    );

  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
