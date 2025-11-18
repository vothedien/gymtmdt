import { Suspense } from "react";

export default function PaymentResultLayout({
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
