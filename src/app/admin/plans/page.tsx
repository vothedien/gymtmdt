"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((j) => setPlans(j.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Plans</h1>

      <Card>
        <CardHeader>
          <CardTitle>Các gói tập</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Period</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
             {/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
              {plans.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.price.toLocaleString()}đ</TableCell>
                  <TableCell>{p.period}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
