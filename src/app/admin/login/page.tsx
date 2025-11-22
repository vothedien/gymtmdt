"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/admin/dashboard";
    } else {
      alert("Sai tài khoản hoặc mật khẩu");
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-6 shadow-xl rounded-xl">
        <h1 className="text-2xl font-bold text-center">Admin Login</h1>

        <Input
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          placeholder="Password" 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button className="w-full" onClick={handleLogin}>
          Đăng nhập
        </Button>
      </div>
    </div>
  );
}
