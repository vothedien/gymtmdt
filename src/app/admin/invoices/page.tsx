"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/invoices")
      .then((res) => res.json())
      .then((json) => setInvoices(json.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Invoices</h1>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách giao dịch</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
              {invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.id}</TableCell>
                  <TableCell>{inv.plan_id}</TableCell>
                  <TableCell>{inv.amount.toLocaleString()}đ</TableCell>
                  <TableCell>{inv.method}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(inv.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
