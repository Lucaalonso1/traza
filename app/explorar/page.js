import Feed from "@/components/social/Feed";
import { currentUser } from "@/lib/server/auth";
import { feed, suggestedUsers, stations } from "@/lib/server/queries";

export const metadata = { title: "Explorar — Traza" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await currentUser();
  const [posts, suggestions, sts] = await Promise.all([feed({ viewer: u?.id ?? 0 }), suggestedUsers(u?.id ?? 0), stations()]);
  return (
    <div className="page page-wide">
      <Feed initial={posts} suggestions={suggestions} stations={sts} />
    </div>
  );
}
