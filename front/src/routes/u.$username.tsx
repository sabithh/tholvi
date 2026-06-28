import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchFeed } from "@/lib/feed";
import { PostCard, type FeedPost } from "@/components/post-card";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  ssr: false,
  head: () => ({ meta: [{ title: "Profile — THOLVI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useCurrentUser();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stats, setStats] = useState({ failures: 0, glows: 0, followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p) { setProfile(null); return; }
      setProfile(p);
      const [{ count: failures }, { count: followers }, { count: followingCnt }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", p.id),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", p.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", p.id),
      ]);
      const { data: postIds } = await supabase.from("posts").select("id").eq("author_id", p.id);
      let glows = 0;
      if (postIds && postIds.length) {
        const { count } = await supabase.from("glows").select("post_id", { count: "exact", head: true }).in("post_id", postIds.map((x: any) => x.id));
        glows = count ?? 0;
      }
      setStats({ failures: failures ?? 0, glows, followers: followers ?? 0, following: followingCnt ?? 0 });
      const feed = await fetchFeed({ authorId: p.id }, user?.id ?? null);
      setPosts(feed);
      if (user && user.id !== p.id) {
        const { data: f } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", p.id).maybeSingle();
        setFollowing(!!f);
      }
    })();
  }, [username, user?.id]);

  async function toggleFollow() {
    if (!user || !profile) return;
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setFollowing(false);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      if (error) { toast.error(error.message); return; }
      setFollowing(true);
    }
  }

  if (profile === null) return <AppShell><div className="py-20 text-center text-white/60">User not found.</div></AppShell>;
  if (!profile) return <AppShell><div className="py-20 text-center text-white/60">Loading…</div></AppShell>;

  const isMe = user?.id === profile.id;

  return (
    <AppShell>
      <div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white mb-4"><ArrowLeft className="h-4 w-4" /> Back</Link>

        <div className="glass rounded-3xl p-4 sm:p-6">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
            <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full bg-white/10 grid place-items-center overflow-hidden">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> :
                <span className="text-2xl font-bold text-white">{profile.display_name[0]?.toUpperCase()}</span>}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{profile.display_name}</h1>
              <div className="text-sm text-white/55 truncate">@{profile.username}</div>
              {profile.bio && <p className="text-sm text-white/75 mt-2 break-words">{profile.bio}</p>}
            </div>
            {user && !isMe && (
              <div className="col-span-2 flex gap-2 sm:col-span-1">
                <button onClick={toggleFollow}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${following ? "bg-white/10 text-white/70 border border-white/10" : "gradient-violet text-white"}`}>
                  {following ? "Following" : "Follow"}
                </button>
                <Link to="/messages/$id" params={{ id: profile.id }}
                  className="rounded-full px-4 py-2 text-xs font-semibold glass text-white flex items-center justify-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> Message
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { l: "Failures", v: stats.failures },
              { l: "Glows", v: stats.glows },
              { l: "Followers", v: stats.followers },
              { l: "Following", v: stats.following },
            ].map((s) => (
              <div key={s.l} className="glass rounded-2xl py-3 px-1 text-center">
                <div className="text-base sm:text-lg font-bold text-white">{s.v}</div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/50">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-white/55 px-1 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Stories</h2>
          {posts.length === 0 ? <div className="glass rounded-3xl p-8 text-center text-white/55">No stories shared yet.</div> :
            posts.map((p) => <PostCard key={p.id} post={p} userId={user?.id ?? null} />)}
        </div>
      </div>
    </AppShell>
  );
}