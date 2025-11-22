// API route: src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data } = await supabaseServer.auth.admin.listUsers();
    return NextResponse.json({ ok: true, data: data.users });
  } // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
