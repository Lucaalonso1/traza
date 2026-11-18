import { route, currentUser } from "@/lib/server/auth";
import { feed } from "@/lib/server/queries";

export const GET = route(async (req) => {
  const u = await currentUser();
  const scope = new URL(req.url).searchParams.get("scope") === "siguiendo" ? "siguiendo" : "todo";
  return Response.json({ posts: await feed({ viewer: u?.id ?? 0, scope }) });
});
