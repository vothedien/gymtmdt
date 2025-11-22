import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data, error } = await supabaseServer.from("plans").select("*");
    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (err: any) {    
    return NextResponse.json({ ok: false, error: err.message });
  }
}
