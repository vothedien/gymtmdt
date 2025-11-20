"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Lấy mã đơn hàng từ cả 2 cổng (VNPAY dùng vnp_TxnRef, MoMo dùng orderId)
  const orderId = searchParams.get("vnp_TxnRef") || searchParams.get("orderId") || "";
  
  // Lấy mã lỗi từ URL để hiển thị ngay lập tức nếu thất bại rõ ràng
  const vnpCode = searchParams.get("vnp_ResponseCode");
  const momoCode = searchParams.get("resultCode");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("loading");
  const [message, setMessage] = useState("Đang xác thực giao dịch...");

  useEffect(() => {
    const checkStatus = async () => {
      if (!orderId) {
        setStatus("error");
        setMessage("Không tìm thấy mã đơn hàng.");
        return;
      }

      // 1. Kiểm tra sơ bộ qua URL (Phản hồi nhanh cho khách hàng)
      // Nếu URL báo lỗi, ta có thể báo lỗi luôn không cần chờ DB
      if ((vnpCode && vnpCode !== "00") || (momoCode && momoCode !== "0")) {
        setStatus("error");
        setMessage("Giao dịch bị hủy hoặc thất bại tại cổng thanh toán.");
        return;
      }

      // 2. Nếu URL báo thành công, ta đợi DB cập nhật (Logic của bạn)
      // Tăng thời gian chờ lên 2s cho chắc chắn, hoặc dùng vòng lặp polling nhẹ
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data, error } = await supabase
        .from("invoices")
        .select("status")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        // Nếu không tìm thấy trong DB nhưng URL báo thành công -> Có thể IPN chưa tới kịp
        // Vẫn báo thành công tạm thời dựa trên niềm tin URL
        setStatus("success"); 
        setMessage("Thanh toán thành công! Hệ thống đang cập nhật dữ liệu.");
      } else if (data.status === "paid" || data.status === "success") {
        setStatus("success");
        setMessage("Giao dịch đã được xác nhận thành công.");
      } else if (data.status === "pending") {
        // Trường hợp tiền đã trừ nhưng Webhook chưa chạy xong
        setStatus("pending");
        setMessage("Chúng tôi đã nhận được yêu cầu. Đang chờ xác nhận từ ngân hàng...");
      } else {
        setStatus("error");
        setMessage("Giao dịch thất bại hoặc đã bị huỷ.");
      }
    };

    checkStatus();
  }, [orderId, vnpCode, momoCode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg bg-white">
        <CardHeader className="flex flex-col items-center pb-2">
          {status === "loading" && <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />}
          {status === "success" && <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />}
          {status === "error" && <XCircle className="h-16 w-16 text-rose-500 mb-4" />}
          {status === "pending" && <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />}
          
          <CardTitle className="text-center text-2xl font-bold text-slate-800">
            {status === "success" && "Thanh toán thành công!"}
            {status === "error" && "Thanh toán thất bại"}
            {status === "loading" && "Đang xử lý..."}
            {status === "pending" && "Đang chờ xác nhận"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-slate-600">{message}</p>
            <p className="text-sm text-slate-400">Mã đơn hàng: <span className="font-mono font-medium text-slate-600">{orderId}</span></p>
          </div>

          <div className="flex flex-col gap-2">
            {status === "success" ? (
              <Button 
                onClick={() => router.push("/")} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Về trang chủ
              </Button>
            ) : (
              <div className="flex gap-2">
                 <Button 
                  variant="outline" 
                  onClick={() => router.push("/")} 
                  className="flex-1"
                >
                  Về trang chủ
                </Button>
                {status === "error" && (
                  <Button 
                    onClick={() => router.push("/#pricing")} 
                    className="flex-1"
                  >
                    Thử lại
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentResult() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Đang tải...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}