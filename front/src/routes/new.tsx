import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CATEGORIES, type Category, categoryMeta } from "@/lib/categories";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/new")({
  ssr: false,
  head: () => ({ meta: [{ title: "Share a failure — THOLVI" }] }),
  component: NewPostPage,
});

function NewPostPage() {
  const { user, profile } = useCurrentUser();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [lessons, setLessons] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [anonymous, setAnonymous] = useState(!user);
  const [posting, setPosting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error("Add a title and story"); return; }
    setPosting(true);

    let authorId = user?.id;
    let forceAnon = anonymous;
    if (!authorId) {
      const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr || !anon.user) {
        setPosting(false);
        toast.error(anonErr?.message ?? "Could not create anonymous session");
        return;
      }
      authorId = anon.user.id;
      forceAnon = true;
    }

    const { data, error } = await supabase.from("posts").insert({
      author_id: authorId, title: title.trim(), body: body.trim(),
      lessons_learned: lessons.trim() || null, category, is_anonymous: forceAnon,
    }).select("id").single();
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Story published");
    router.navigate({ to: "/post/$id", params: { id: (data as any).id } });
  }

  const meta = categoryMeta(category);

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-3xl sm:text-4xl font-display text-white">Share a failure</h1>
        <p className="text-white/55 text-sm -mt-3">What went wrong, and what did it teach you?</p>

        {!user && (
          <div className="glass rounded-2xl px-4 py-3 text-sm text-white/70 flex items-center gap-2">
            <Lock className="h-4 w-4 text-white/60" />
            You're posting without an account — your story will be published anonymously.
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={submit} className="glass rounded-3xl p-4 sm:p-5 space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Title (e.g. The startup that burned $1M in 6 months)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400/50" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Tell the story honestly…"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400/50 resize-none" />
            <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={3} placeholder="Lessons learned (optional)"
              className="w-full bg-amber-300/5 border border-amber-200/15 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-amber-100/40 focus:outline-none focus:border-amber-300/40 resize-none" />

            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Category</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c.value} onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                      category === c.value ? "bg-white/15 text-white border-white/25" : "bg-white/5 text-white/60 border-white/10"
                    }`}>
                    <c.icon className="h-3.5 w-3.5" />{c.label}
                  </button>
                ))}
              </div>
            </div>

            {user && (
              <label className="flex items-center justify-between glass rounded-2xl px-4 py-3 cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Lock className="h-4 w-4 text-white/60" /> Post anonymously
                </div>
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-violet-500 h-4 w-4" />
              </label>
            )}

            <button disabled={posting} className="w-full gradient-violet text-white font-semibold py-3 rounded-2xl glow-violet disabled:opacity-50">
              {posting ? "Publishing…" : "Publish story"}
            </button>
          </form>

          <aside className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-white/50">Live preview</div>
            <div className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                {anonymous || !user ? (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 grid place-items-center text-white/40">?</div>
                    <span className="text-sm text-white/70">Anonymous</span>
                  </div>
                ) : profile ? (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center overflow-hidden">
                      {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> :
                        <span className="text-white text-sm font-semibold">{profile.display_name[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="leading-tight">
                      <div className="text-sm text-white">{profile.display_name}</div>
                      <div className="text-xs text-white/50">@{profile.username}</div>
                    </div>
                  </div>
                ) : null}
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-white/80 border border-white/10 bg-gradient-to-br ${meta.tint}`}>
                  <meta.icon className="h-3.5 w-3.5" /><span>{meta.label}</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title || "Your title…"}</h3>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{body || "Your story will appear here as you type."}</p>
              {lessons && (
                <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-300/5 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-amber-200/80 mb-1">Lessons learned</div>
                  <p className="text-sm text-amber-50/90 whitespace-pre-wrap">{lessons}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}