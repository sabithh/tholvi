import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchFeed } from "@/lib/feed";
import { PostCard } from "@/components/post-card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AppShell } from "@/components/app-shell";
import { CATEGORIES, type Category } from "@/lib/categories";
import tholviLogo from "@/assets/tholvi-logo-transparent.png";

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

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["feed-public", tab, cat, user?.id ?? null],
    queryFn: () =>
      fetchFeed(
        { category: cat, followingOf: tab === "following" && user ? user.id : undefined },
        user?.id ?? null,
      ),
  });

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

        <div className="glass rounded-2xl p-1.5 flex gap-1">
          {(["foryou", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                tab === t ? "bg-white/10 text-white" : "text-white/55"
              }`}
            >
              {t === "foryou" ? "For you" : "Following"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setCat(null)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
              cat === null ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-white/60 border-white/10"
            }`}
          >
            All
          </button>
          {CATEGORIES.filter((c) => c.value !== "general").map((c) => (
            <button
              key={c.value}
              onClick={() => setCat(c.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                cat === c.value ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-white/60 border-white/10"
              }`}
            >
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="glass rounded-3xl h-44 animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-white/70">No stories yet here.</p>
            <p className="text-white/45 text-sm mt-1">
              {tab === "following" ? "Follow people to fill your feed." : "Be the first to share."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => <PostCard key={p.id} post={p} userId={user?.id ?? null} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}