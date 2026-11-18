import { notFound } from "next/navigation";
import PostCard from "@/components/social/PostCard";
import Comments from "@/components/social/Comments";
import { currentUser } from "@/lib/server/auth";
import { post } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const p = await post(Number((await params).id));
  return { title: p ? `${p.nombre} en ${p.estacion ?? "Traza"} — Traza` : "Publicación — Traza" };
}

export default async function Page({ params }) {
  const u = await currentUser();
  const p = await post(Number((await params).id), u?.id ?? 0);
  if (!p) notFound();
  return (
    <div className="page page-post">
      <PostCard post={p} />
      <Comments postId={p.id} initial={p.comments} />
    </div>
  );
}
