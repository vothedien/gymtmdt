import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// --- Cấu hình Supabase (Giữ nguyên) ---
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

// --- Hàm sortObject (Giữ nguyên) ---
function sortObject(obj: Record<string, string>) {
    const sorted: Record<string, string> = {};
    Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
    return sorted;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());

    const vnp_SecureHash = rawParams["vnp_SecureHash"];
    const secret = process.env.VNP_HASH_SECRET!.trim(); 
    const vnp_TxnRef = rawParams["vnp_TxnRef"];

    // Lấy URL hiển thị kết quả từ ENV
    const vnp_ReturnUrlDisplay = process.env.VNP_RETURN_URL!;

    // 1. Loại bỏ Hash và Type trước khi ký
    delete rawParams["vnp_SecureHash"];
    delete rawParams["vnp_SecureHashType"];

    const sorted = sortObject(rawParams);

    // 2. TẠO CHUỖI KÝ (signData) - NỐI CHUỖI THỦ CÔNG KHÔNG MÃ HÓA
    const signData = (Object.entries(sorted) as [string, string][])
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
    
    // --- Bắt đầu xác thực chữ ký ---
    const checkHash = crypto
        .createHmac("sha512", secret)
        .update(signData, "utf-8")
        .digest("hex");

    if (checkHash !== vnp_SecureHash) {
        // LỖI 97: Sai chữ ký - Trả về JSON cho VNPAY VÀ KHÔNG CHUYỂN HƯỚNG
        console.error("VNPAY IPN: Invalid signature for OrderId:", vnp_TxnRef);
        return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
    }
    
    // --- Bắt đầu xử lý dữ liệu và cập nhật DB ---
    const responseCode = sorted["vnp_ResponseCode"];
    const transStatus  = sorted["vnp_TransactionStatus"];
    const txnNo        = sorted["vnp_TransactionNo"] || "";
    const success = responseCode === "00" && transStatus === "00";
    const status  = success ? "Hoàn tất" : "Thất bại";

    try {
        const { error } = await supabase
            .from("invoices")
            .update({ status, transaction_id: txnNo, method: "VNPAY" })
            .eq("id", vnp_TxnRef);

        if (error) {
            console.error("VNPAY IPN: Supabase Update Error:", error);
            // VNPAY yêu cầu trả về JSON RspCode: 99
            return NextResponse.json({ RspCode: "99", Message: "Database update failed" });
        }
        
    } catch (e) {
        console.error("VNPAY IPN: Critical Server Error during DB update:", e);
        return NextResponse.json({ RspCode: "99", Message: "Unknown server error" });
    }
    
    // 🚩 RspCode = 00: Thành công
    console.log(`VNPAY IPN: Transaction ${status} and confirmed for OrderId: ${vnp_TxnRef}`);

    // --- CHUYỂN HƯỚNG TRÌNH DUYỆT ĐẾN TRANG KẾT QUẢ CUỐI CÙNG ---
    
    // Lấy tất cả params hiện tại (bao gồm vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash mới, v.v.)
    // VNPAY sẽ thêm vnp_SecureHash mới vào rawParams trước khi gửi.
    const finalParams = new URLSearchParams(rawParams).toString(); 
    
    // Nối URL hiển thị kết quả với các tham số giao dịch
    const finalReturnUrl = `${vnp_ReturnUrlDisplay}?${finalParams}`;

    // *QUAN TRỌNG:* Bạn cần trả về phản hồi chuẩn VNPAY (JSON)
    // Sau đó, bạn cần thêm logic chuyển hướng. 
    // Trong môi trường Next.js/Vercel/Ngrok, việc trả về JSON và đồng thời redirect rất khó.
    // Cách an toàn nhất là trả về JSON, sau đó client tự redirect.
    // NHƯNG vì VNPAY đang gọi IPN bằng cách chuyển hướng client, ta phải dùng NextResponse.redirect.

    // 1. Trả về JSON cho VNPAY (theo giao thức VNPAY)
    // 2. Client sẽ nhận phản hồi JSON, nhưng trình duyệt của họ đang ở URL IPN
    
    // 💡 GIẢI PHÁP ĐƠN GIẢN VÀ CÓ THỂ GÂY LỖI GIAO THỨC VNPAY:
    // Vì đang dùng GET/Redirect, ta sẽ chuyển hướng luôn.
    
    // Trả về JSON RspCode: "00" (theo giao thức IPN)
    // return NextResponse.json({ RspCode: "00", Message: "Confirm Success" }); 

    // CHUYỂN HƯỚNG TRÌNH DUYỆT (Client-side)
    // Đảm bảo client có thể tự xử lý redirect sau khi nhận JSON, hoặc:
    
    // ❌ SỬ DỤNG PHƯƠNG PHÁP NEXT.JS REDIRECT VÀ XÁC ĐỊNH LẠI CÁCH GỌI Ở FILE CREATE
    // Nếu VNPAY không yêu cầu phản hồi JSON trên luồng client, ta redirect.
    return NextResponse.redirect(finalReturnUrl, 302);
}