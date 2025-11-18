// File: src/app/api/momo/create/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // 1. Lấy số tiền từ client gửi lên
    const { amount } = await request.json();

    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    // 2. Lấy thông tin từ biến môi trường (.env.local)
    // Đảm bảo bạn đã thêm các biến này vào file .env.local
    const partnerCode = process.env.MOMO_PARTNER_CODE!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const endpoint = process.env.MOMO_ENDPOINT!;
    const redirectUrl = process.env.MOMO_REDIRECT_URL!;
    const ipnUrl = process.env.MOMO_IPN_URL!;

    // 3. Chuẩn bị các tham số
    const orderInfo = "Thanh toan don hang qua MoMo";
    const orderId = partnerCode + new Date().getTime(); // Mã đơn hàng duy nhất
    const requestId = orderId;
    const requestType = "payWithATM"; // Hoặc "captureWallet" nếu dùng app MoMo
    const extraData = ""; // Có thể để rỗng
    const lang = "vi";

    // 4. Tạo chuỗi rawHash để tạo chữ ký
    // Thứ tự các trường PHẢI giống hệt như sau:
    const rawHash = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    // 5. Tạo chữ ký (Signature)
    // Đây là phần thay thế cho hash_hmac("sha256", $rawHash, $serectkey)
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawHash)
      .digest("hex");

    // 6. Chuẩn bị body để gửi sang MoMo
    const requestBody = {
      partnerCode: partnerCode,
      partnerName: "Test", // Tên test hoặc tên cửa hàng của bạn
      storeId: "MomoTestStore", // Mã cửa hàng
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      lang: lang,
      extraData: extraData,
      requestType: requestType,
      signature: signature, // Chữ ký vừa tạo
    };

    // 7. Gửi request sang MoMo
    // Đây là phần thay thế cho cURL (execPostRequest)
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const jsonResult = await response.json();

    // 8. Trả payUrl về cho client
    if (jsonResult.payUrl) {
      return NextResponse.json({ url: jsonResult.payUrl });
    } else {
      // Xử lý nếu MoMo trả về lỗi
      console.error("MoMo Error:", jsonResult);
      return NextResponse.json(
        { error: jsonResult.message || "Failed to create MoMo payment" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}