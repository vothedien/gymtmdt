import { Suspense } from "react";

export default function PaymentReturnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Đang tải kết quả thanh toán...</div>}>
      {children}
    </Suspense>
  );
}
