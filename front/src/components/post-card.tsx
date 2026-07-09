import { Link } from "@tanstack/react-router";
import { Bookmark, MessageCircle, Sparkles } from "lucide-react";
import { categoryMeta, timeAgo } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

export type FeedPost = {
  id: string;
  title: string;
  body: string;
  category: string;
  is_anonymous: boolean;
  created_at: string;
  author: { id: string; username: string; display_name: string; avatar_url: string | null } | null;
  glow_count: number;
  comment_count: number;
  i_glowed: boolean;
  i_bookmarked: boolean;
};

export function AuthorBlock({ post, size = "sm", link = true }: { post: FeedPost; size?: "sm" | "md"; link?: boolean }) {
  if (post.is_anonymous || !post.author) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${size === "md" ? "h-10 w-10" : "h-8 w-8"} rounded-full bg-white/5 border border-white/10 grid place-items-center text-white/40 text-sm`}>?
        </div>
        <div className="text-sm text-white/70">Anonymous</div>
      </div>
    );
  }
  const content = (
    <>
      <div className={`${size === "md" ? "h-10 w-10" : "h-8 w-8"} shrink-0 rounded-full bg-white/10 overflow-hidden grid place-items-center`}>
        {post.author.avatar_url ? (
          <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-white">{post.author.display_name[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="leading-tight min-w-0">
        <div className="text-sm text-white truncate">{post.author.display_name}</div>
        <div className="text-xs text-white/50 truncate">@{post.author.username}</div>
      </div>
    </>
  );

  if (!link) {
    return <div className="flex items-center gap-2 min-w-0">{content}</div>;
  }

  return (
    <Link to="/u/$username" params={{ username: post.author.username }} className="flex items-center gap-2 hover:opacity-80 min-w-0">
      {content}
    </Link>
  );
}

export function PostCard({ post, userId }: { post: FeedPost; userId: string | null }) {
  const meta = categoryMeta(post.category);
  const qc = useQueryClient();
  const [glowed, setGlowed] = useState(post.i_glowed);
  const [bookmarked, setBookmarked] = useState(post.i_bookmarked);
  const [count, setCount] = useState(post.glow_count);

  async function toggleGlow(e: React.MouseEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error("Sign in to glow this story");
      return;
    }
    if (glowed) {
      setGlowed(false); setCount((c) => c - 1);
      await supabase.from("glows").delete().eq("post_id", post.id).eq("user_id", userId);
    } else {
      setGlowed(true); setCount((c) => c + 1);
      await supabase.from("glows").insert({ post_id: post.id, user_id: userId });
    }
    qc.invalidateQueries({ queryKey: ["feed"] });
  }
  async function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error("Sign in to bookmark");
      return;
    }
    if (bookmarked) {
      setBookmarked(false);
      await supabase.from("bookmarks").delete().eq("post_id", post.id).eq("user_id", userId);
    } else {
      setBookmarked(true);
      await supabase.from("bookmarks").insert({ post_id: post.id, user_id: userId });
      toast.success("Saved to bookmarks");
    }
  }

  return (
    <Link
      to="/post/$id"
      params={{ id: post.id }}
      className="relative block premium-card premium-card-hover rounded-3xl p-4 sm:p-6 group card-in overflow-hidden"
    >
      <span className="sheen" />
      {/* top hairline highlight */}
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
        <div className="min-w-0 flex-1"><AuthorBlock post={post} link={false} /></div>
        <div className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] uppercase tracking-[0.14em] text-white/85 border border-white/10 bg-gradient-to-br ${meta.tint} shadow-[0_4px_20px_-8px_rgba(168,85,247,0.5)]`}>
          <meta.icon className="h-3.5 w-3.5" />
          <span>{meta.label}</span>
        </div>
      </div>
      <h3 className="font-display text-[1.35rem] sm:text-[1.65rem] leading-[1.15] text-white mb-2 tracking-tight group-hover:text-violet-100 transition-colors break-words">
        {post.title}
      </h3>
      <p className="text-[13.5px] leading-relaxed text-white/60 line-clamp-3 mb-5">{post.body}</p>
      <div className="flex items-center gap-4 text-xs text-white/55 pt-3 border-t border-white/[0.06]">
        <span>{timeAgo(post.created_at)}</span>
        <button onClick={toggleGlow} className={`flex items-center gap-1.5 hover:text-violet-300 transition ${glowed ? "text-violet-300 drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]" : ""}`}>
          <Sparkles className={`h-4 w-4 ${glowed ? "fill-violet-400" : ""}`} />
          <span>{count}</span>
        </button>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          <span>{post.comment_count}</span>
        </span>
        <button onClick={toggleBookmark} className={`ml-auto hover:text-violet-300 transition ${bookmarked ? "text-violet-300" : ""}`}>
          <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
        </button>
      </div>
    </Link>
  );
}