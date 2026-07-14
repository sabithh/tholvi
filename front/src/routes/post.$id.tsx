import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, Edit2, MessageCircle, Send, Sparkles, Trash2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { categoryMeta, timeAgo, CATEGORIES, type Category } from "@/lib/categories";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/post/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Story — THOLVI" }] }),
  component: PostPage,
  notFoundComponent: () => <div className="p-10 text-center text-white/70">Story not found.</div>,
  errorComponent: () => <div className="p-10 text-center text-white/70">Couldn't load this story.</div>,
});

function PostPage() {
  const { id } = Route.useParams();
  const { user } = useCurrentUser();
  const router = useRouter();
  const [post, setPost] = useState<any>(undefined);
  const [author, setAuthor] = useState<any>(null);
  const [glows, setGlows] = useState(0);
  const [glowed, setGlowed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [anon, setAnon] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLessons, setEditLessons] = useState("");
  const [editCategory, setEditCategory] = useState<Category>("general");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (!p) { setPost(null); return; }
      setPost(p);
      setEditTitle(p.title);
      setEditBody(p.body);
      setEditLessons(p.lessons_learned ?? "");
      setEditCategory(p.category);
      if (!p.is_anonymous) {
        const { data: a } = await supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", p.author_id).maybeSingle();
        setAuthor(a);
      }
      const { count } = await supabase.from("glows").select("post_id", { count: "exact", head: true }).eq("post_id", id);
      setGlows(count ?? 0);
      if (user) {
        const { data: g } = await supabase.from("glows").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle();
        setGlowed(!!g);
        const { data: b } = await supabase.from("bookmarks").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle();
        setBookmarked(!!b);
      }
      await loadComments();
    })();
  }, [id, user?.id]);

  async function loadComments() {
    const { data: cs } = await supabase.from("comments").select("id,author_id,body,is_anonymous,created_at").eq("post_id", id).order("created_at", { ascending: true });
    const authorIds = Array.from(new Set((cs ?? []).filter((c: any) => !c.is_anonymous).map((c: any) => c.author_id)));
    let profileMap = new Map<string, any>();
    if (authorIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds);
      for (const p of (profs ?? []) as any[]) profileMap.set(p.id, p);
    }
    setComments((cs ?? []).map((c: any) => ({ ...c, author: c.is_anonymous ? null : profileMap.get(c.author_id) })));
  }

  async function toggleGlow() {
    if (!user) { toast.error("Sign in to glow"); return; }
    if (glowed) { setGlowed(false); setGlows((c) => c - 1); await supabase.from("glows").delete().eq("post_id", id).eq("user_id", user.id); }
    else { setGlowed(true); setGlows((c) => c + 1); await supabase.from("glows").insert({ post_id: id, user_id: user.id }); }
  }
  async function toggleBookmark() {
    if (!user) { toast.error("Sign in to bookmark"); return; }
    if (bookmarked) { setBookmarked(false); await supabase.from("bookmarks").delete().eq("post_id", id).eq("user_id", user.id); }
    else { setBookmarked(true); await supabase.from("bookmarks").insert({ post_id: id, user_id: user.id }); }
  }
  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast.error("Sign in to comment"); return; }
    if (!draft.trim()) return;
    const text = draft.trim(); setDraft("");
    const { error } = await supabase.from("comments").insert({ post_id: id, author_id: user.id, body: text, is_anonymous: anon });
    if (error) toast.error(error.message); else await loadComments();
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editBody.trim()) { toast.error("Title and story are required"); return; }
    setSaving(true);
    const { error } = await supabase.from("posts").update({
      title: editTitle.trim(),
      body: editBody.trim(),
      lessons_learned: editLessons.trim() || null,
      category: editCategory,
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPost((p: any) => ({ ...p, title: editTitle.trim(), body: editBody.trim(), lessons_learned: editLessons.trim() || null, category: editCategory }));
    setEditing(false);
    toast.success("Story updated");
  }

  async function deletePost() {
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Story deleted");
    router.navigate({ to: "/", replace: true });
  }

  if (post === undefined) return <AppShell><div className="py-20 text-center text-white/60">Loading…</div></AppShell>;
  if (post === null) return <AppShell><div className="py-20 text-center text-white/60">Story not found.</div></AppShell>;

  const meta = categoryMeta(editing ? editCategory : post.category);
  const isAuthor = user?.id === post.author_id;

  return (
    <AppShell>
      <div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white mb-4"><ArrowLeft className="h-4 w-4" /> Back</Link>

        <article className="glass rounded-3xl p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-5 min-w-0">
            {post.is_anonymous || !author ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 border border-white/10 grid place-items-center text-white/40">?</div>
                <div className="text-sm text-white/70">Anonymous</div>
              </div>
            ) : (
              <Link to="/u/$username" params={{ username: author.username }} className="flex items-center gap-2 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 grid place-items-center overflow-hidden">
                  {author.avatar_url ? <img src={author.avatar_url} alt="" className="h-full w-full object-cover" /> :
                    <span className="text-white font-semibold">{author.display_name[0]?.toUpperCase()}</span>}
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-sm text-white truncate">{author.display_name}</div>
                  <div className="text-xs text-white/50 truncate">@{author.username} · {timeAgo(post.created_at)}</div>
                </div>
              </Link>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-white/80 border border-white/10 bg-gradient-to-br ${meta.tint}`}>
                <meta.icon className="h-3.5 w-3.5" /><span>{meta.label}</span>
              </div>
              {/* Author controls */}
              {isAuthor && !editing && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(true)} className="h-8 w-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition" title="Edit">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(true)} className="h-8 w-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-red-400 transition" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="glass rounded-2xl p-4 mb-5 border border-red-400/30">
              <p className="text-sm text-white mb-3">Are you sure you want to delete this story? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={deletePost} disabled={deleting}
                  className="rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-50">
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="rounded-xl glass text-white/70 hover:text-white text-sm px-4 py-2 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {editing ? (
            /* Edit Form */
            <div className="space-y-3">
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={140}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-400/50 text-lg font-display" />
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} placeholder="Tell the story…"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-400/50 resize-none" />
              <textarea value={editLessons} onChange={(e) => setEditLessons(e.target.value)} rows={3} placeholder="Lessons learned (optional)"
                className="w-full bg-amber-300/5 border border-amber-200/15 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-300/40 resize-none" />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => setEditCategory(c.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${editCategory === c.value ? "bg-white/15 text-white border-white/25" : "bg-white/5 text-white/60 border-white/10"}`}>
                    <c.icon className="h-3.5 w-3.5" />{c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveEdit} disabled={saving}
                  className="flex items-center gap-1.5 gradient-violet text-white font-semibold px-5 py-2.5 rounded-2xl glow-violet disabled:opacity-50 text-sm">
                  <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 glass text-white/70 hover:text-white px-5 py-2.5 rounded-2xl text-sm transition">
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display text-white mb-4 leading-tight break-words">{post.title}</h1>
              <div className="text-[15px] sm:text-base text-white/80 leading-relaxed whitespace-pre-wrap break-words">{post.body}</div>

              {post.lessons_learned && (
                <div className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-300/5 p-5">
                  <div className="text-[11px] uppercase tracking-widest text-amber-200/90 mb-2">Lessons learned</div>
                  <p className="text-amber-50/95 whitespace-pre-wrap">{post.lessons_learned}</p>
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex items-center gap-5 text-sm text-white/60">
            <button onClick={toggleGlow} className={`flex items-center gap-1.5 hover:text-violet-300 ${glowed ? "text-violet-300" : ""}`}>
              <Sparkles className={`h-5 w-5 ${glowed ? "fill-violet-400" : ""}`} /> {glows} Glows
            </button>
            <span className="flex items-center gap-1.5"><MessageCircle className="h-5 w-5" /> {comments.length}</span>
            <button onClick={toggleBookmark} className={`ml-auto hover:text-violet-300 ${bookmarked ? "text-violet-300" : ""}`}>
              <Bookmark className={`h-5 w-5 ${bookmarked ? "fill-current" : ""}`} />
            </button>
          </div>
        </article>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-3">Comments</h2>
          {user ? (
            <form onSubmit={postComment} className="glass rounded-2xl p-3 flex items-center gap-2 mb-4">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Share your take…"
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none px-2" />
              <label className="text-[11px] text-white/55 flex items-center gap-1">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="accent-violet-500" /> anon
              </label>
              <button className="rounded-xl gradient-violet text-white px-3 py-2"><Send className="h-4 w-4" /></button>
            </form>
          ) : (
            <div className="glass rounded-2xl p-4 mb-4 text-center">
              <p className="text-sm text-white/60">
                <Link to="/auth" className="text-violet-400 hover:text-violet-300 font-medium underline underline-offset-2">Sign in</Link>
                {" "}to join the conversation.
              </p>
            </div>
          )}
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  {c.is_anonymous || !c.author ? (
                    <span className="text-xs text-white/55">Anonymous</span>
                  ) : (
                    <Link to="/u/$username" params={{ username: c.author.username }} className="text-xs text-white/80 hover:text-white">@{c.author.username}</Link>
                  )}
                  <span className="text-[10px] text-white/40">· {timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-white/85 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-white/45 text-sm text-center py-4">No comments yet.</p>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}