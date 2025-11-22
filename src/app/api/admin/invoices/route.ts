import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data: invoices, error } = await supabaseServer
      .from("invoices")
      .select("*, user_id");

    if (error) throw error;

    return NextResponse.json({ ok: true, data: invoices });
  } // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
