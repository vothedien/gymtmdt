"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
//import { Badge } from "@/components/ui/badge";

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    fetch("/api/admin/subscriptions")
      .then((res) => res.json())
      .then((json) => setSubs(json.data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscriptions</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gói đăng ký (từ invoices)</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Thanh toán lúc</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
              {subs.map((s: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.plan_id}</TableCell>
                  <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
