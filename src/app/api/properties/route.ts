// src/app/api/properties/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("properties_public_view")
      .select(`
        id,
        uprn,
        postcode,
        street,
        house_number,
        lat,
        lon,
        price_estimate,
        claimed_by_user_id,
        is_claimed,
        is_open_to_talking,
        is_for_sale,
        is_for_rent,
        has_recent_activity
      `)
      .limit(200);

    if (error) {
      console.error("Supabase error in /api/properties:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ properties: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error in /api/properties:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
