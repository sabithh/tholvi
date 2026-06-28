import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PostCard, type FeedPost } from "@/components/post-card";
import { fetchFeed } from "@/lib/feed";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — THOLVI" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { user } = useCurrentUser();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"posts" | "people">("posts");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [follows, setFollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from("follows").select("following_id").eq("follower_id", user.id).then(({ data }) => {
      setFollows(new Set((data ?? []).map((f: any) => f.following_id)));
    });
  }, [user]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setPosts([]); setPeople([]); return; }
    const t = setTimeout(async () => {
      if (tab === "posts") {
        const data = await fetchFeed({ search: term }, user?.id ?? null);
        setPosts(data);
      } else {
        const { data } = await supabase.from("profiles")
          .select("id,username,display_name,avatar_url,bio")
          .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
          .limit(30);
        setPeople(data ?? []);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, tab, user?.id]);

  async function toggleFollow(id: string) {
    if (!user) return;
    if (follows.has(id)) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
      setFollows((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
      if (error) { toast.error(error.message); return; }
      setFollows((s) => new Set(s).add(id));
      toast.success("Following");
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-display text-white">Search</h1>
      <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3">
        <SearchIcon className="h-5 w-5 text-white/50" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories, people, lessons…"
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40" />
      </div>
      <div className="glass rounded-2xl p-1.5 flex gap-1">
        {(["posts","people"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === t ? "bg-white/10 text-white" : "text-white/55"}`}>
            {t === "posts" ? "Posts" : "People"}
          </button>
        ))}
      </div>

      {tab === "posts" ? (
        <div className="space-y-3">
          {posts.map((p) => <PostCard key={p.id} post={p} userId={user?.id ?? null} />)}
          {q && posts.length === 0 && <p className="text-white/50 text-sm text-center py-8">No posts found.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <Link to="/u/$username" params={{ username: p.username }} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> :
                    <span className="text-white text-sm font-semibold">{p.display_name[0]?.toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-sm truncate">{p.display_name}</div>
                  <div className="text-white/50 text-xs truncate">@{p.username}</div>
                </div>
              </Link>
              {user && p.id !== user.id && (
                <button onClick={() => toggleFollow(p.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    follows.has(p.id) ? "bg-white/10 text-white/70 border border-white/10" : "gradient-violet text-white"
                  }`}>
                  {follows.has(p.id) ? "Following" : "Follow"}
                </button>
              )}
            </div>
          ))}
          {q && people.length === 0 && <p className="text-white/50 text-sm text-center py-8">No people found.</p>}
        </div>
      )}
    </div>
  );
}