import { destroySession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  await destroySession();
  return Response.json({ status: "ok" });
}
