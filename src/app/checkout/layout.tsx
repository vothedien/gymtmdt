import { Suspense } from "react";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Đang tải trang checkout...</div>}>
      {children}
    </Suspense>
  );
}

