import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/feed";
import { PostCard } from "@/components/post-card";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "Bookmarks — THOLVI" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user } = useCurrentUser();
  const { data = [], isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => fetchFeed({ bookmarkedBy: user!.id }, user!.id),
    enabled: !!user,
  });
  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-display text-white">Bookmarks</h1>
      {isLoading ? <div className="glass rounded-3xl h-44 animate-pulse" /> :
        data.length === 0 ? <div className="glass rounded-3xl p-10 text-center text-white/55">No bookmarks yet.</div> :
        <div className="space-y-4">{data.map((p) => <PostCard key={p.id} post={p} userId={user!.id} />)}</div>}
    </div>
  );
}