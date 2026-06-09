import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const configuredSecret = process.env.CRON_SECRET;
  const requestUrl = new URL(request.url);
  const providedSecret = requestUrl.searchParams.get("secret");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { error, count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          checkedAt: new Date().toISOString(),
          supabase: "error",
          error: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      supabase: "ok",
      table: "students",
      count
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        supabase: "error",
        error: error.message
      },
      { status: 500 }
    );
  }
}
