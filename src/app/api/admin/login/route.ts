import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const hash = crypto.createHash("sha256").update(password).digest("hex");

  const { data: admin, error } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email)
    .eq("password_hash", hash)
    .single();

  if (error || !admin) {
    return NextResponse.json({ success: false });
  }

  const token = crypto.randomBytes(32).toString("hex");

  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": `admin_token=${token}; Path=/; HttpOnly; Secure`,
      }
    }
  );
}
