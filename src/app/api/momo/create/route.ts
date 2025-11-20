// File: src/app/api/momo/create/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // 1. Lấy dữ liệu từ client gửi lên (ĐÃ SỬA)
    // Chúng ta cần lấy cả orderId và orderInfo mà client đã tạo
    const { amount, orderId: clientOrderId, orderInfo: clientOrderInfo } = await request.json();

    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    // 2. Lấy thông tin từ biến môi trường
    const partnerCode = process.env.MOMO_PARTNER_CODE!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const endpoint = process.env.MOMO_ENDPOINT!;
    const redirectUrl = process.env.MOMO_REDIRECT_URL!;
    const notifyUrl = process.env.MOMO_IPN_URL!;

    // 3. Chuẩn bị các tham số (ĐÃ SỬA)
    // Ưu tiên dùng thông tin từ Client gửi lên để khớp với Database
    const orderInfo = clientOrderInfo || "Thanh toan don hang qua MoMo";
    const orderId = clientOrderId || (partnerCode + new Date().getTime()); // Dùng mã INV... từ client
    const requestId = orderId; // RequestId nên giống OrderId
    const requestType = "payWithATM"; // Hoặc "captureWallet"
    const extraData = ""; 
    const lang = "vi";

    // 4. Tạo chuỗi rawHash
    const rawHash = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&notifyUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    // 5. Tạo chữ ký (Signature)
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawHash)
      .digest("hex");

    // 6. Chuẩn bị body
    const requestBody = {
      partnerCode: partnerCode,
      partnerName: "GymX Store",
      storeId: "GymX",
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      notifyUrl: notifyUrl,
      lang: lang,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
    };

    // 7. Gửi request sang MoMo
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const jsonResult = await response.json();

    // 8. Trả kết quả về
    // Tôi đổi key thành 'payUrl' để thống nhất với VNPAY, client của bạn sẽ dễ xử lý hơn
    if (jsonResult.payUrl) {
      return NextResponse.json({ payUrl: jsonResult.payUrl }); 
    } else {
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