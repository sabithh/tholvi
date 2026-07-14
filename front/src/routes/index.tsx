import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { fetchFeed, PAGE_SIZE } from "@/lib/feed";
import { PostCard, type FeedPost } from "@/components/post-card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AppShell } from "@/components/app-shell";
import { CATEGORIES, type Category } from "@/lib/categories";
import tholviLogo from "@/assets/tholvi-logo-transparent.png";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "THOLVI — Learn from failure" },
      { name: "description", content: "Real stories of failure from founders, freelancers, and pros." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [cat, setCat] = useState<Category | null>(null);
  const [extraPosts, setExtraPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  function resetPagination() {
    setExtraPosts([]);
    setCursor(null);
    setHasMore(true);
  }

  const { data: firstPage = [], isLoading } = useQuery({
    queryKey: ["feed-public", tab, cat, user?.id ?? null],
    queryFn: async () => {
      resetPagination();
      const result = await fetchFeed(
        { category: cat, followingOf: tab === "following" && user ? user.id : undefined },
        user?.id ?? null,
      );
      setHasMore(result.length === PAGE_SIZE);
      return result;
    },
  });

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    // Use the cursor: oldest post in current list
    const allCurrent = [...firstPage, ...extraPosts];
    const oldestCreatedAt = allCurrent[allCurrent.length - 1]?.created_at;
    if (!oldestCreatedAt) return;
    setLoadingMore(true);
    try {
      const more = await fetchFeed(
        { category: cat, followingOf: tab === "following" && user ? user.id : undefined, cursor: oldestCreatedAt },
        user?.id ?? null,
      );
      setExtraPosts((prev) => [...prev, ...more]);
      setCursor(oldestCreatedAt);
      setHasMore(more.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [firstPage, extraPosts, cat, tab, user, loadingMore, hasMore]);

  const allPosts = [...firstPage, ...extraPosts];

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex items-center justify-between gap-3 min-w-0">
          <div className="md:hidden flex items-center gap-3 min-w-0">
            <img
              src={tholviLogo}
              alt="THOLVI — Share your fails. Inspire others."
              className="h-10 w-auto shrink-0 object-contain invert drop-shadow-[0_0_20px_rgba(168,85,247,0.45)]"
            />
          </div>
          <h1 className="hidden md:block text-3xl font-display text-white tracking-tight">Home</h1>
          {!user && (
            <Link
              to="/auth"
              className="shrink-0 rounded-2xl gradient-violet text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 glow-violet hover:brightness-110 transition"
            >
              Sign in
            </Link>
          )}
        </header>

        {/* Tab switcher */}
        <div className="glass rounded-2xl p-1.5 flex gap-1">
          {(["foryou", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); resetPagination(); }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === t ? "bg-white/10 text-white" : "text-white/55"}`}
            >
              {t === "foryou" ? "For you" : "Following"}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => { setCat(null); resetPagination(); }}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
              cat === null ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-white/60 border-white/10"
            }`}
          >
            All
          </button>
          {CATEGORIES.filter((c) => c.value !== "general").map((c) => (
            <button
              key={c.value}
              onClick={() => { setCat(c.value); resetPagination(); }}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                cat === c.value ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-white/60 border-white/10"
              }`}
            >
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="glass rounded-3xl h-44 animate-pulse" />)}</div>
        ) : allPosts.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-white/70">No stories yet here.</p>
            <p className="text-white/45 text-sm mt-1">
              {tab === "following"
                ? <><Link to="/search" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Find people to follow</Link> to fill your feed.</>
                : "Be the first to share."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {allPosts.map((p) => <PostCard key={p.id} post={p} userId={user?.id ?? null} />)}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 glass rounded-2xl px-6 py-3 text-sm text-white/70 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                  ) : (
                    "Load more stories"
                  )}
                </button>
              </div>
            )}
            {!hasMore && allPosts.length > PAGE_SIZE && (
              <p className="text-center text-xs text-white/30 pb-4">You've seen it all! 🎉</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}