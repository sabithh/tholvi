import { supabase } from "@/integrations/supabase/client";
import type { FeedPost } from "@/components/post-card";

type Filter = { category?: string | null; authorId?: string; followingOf?: string; bookmarkedBy?: string; search?: string };

export async function fetchFeed(filter: Filter, userId: string | null): Promise<FeedPost[]> {
  let q = supabase.from("posts").select("id,title,body,category,is_anonymous,created_at,author_id");
  if (filter.category) q = q.eq("category", filter.category as any);
  if (filter.authorId) q = q.eq("author_id", filter.authorId);
  if (filter.search) q = q.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`);
  q = q.order("created_at", { ascending: false }).limit(50);

  let postIds: string[] = [];
  if (filter.followingOf) {
    const { data: fol } = await supabase.from("follows").select("following_id").eq("follower_id", filter.followingOf);
    const ids = (fol ?? []).map((f: any) => f.following_id);
    if (ids.length === 0) return [];
    q = q.in("author_id", ids);
  }
  if (filter.bookmarkedBy) {
    const { data: bk } = await supabase.from("bookmarks").select("post_id").eq("user_id", filter.bookmarkedBy);
    const ids = (bk ?? []).map((b: any) => b.post_id);
    if (ids.length === 0) return [];
    q = q.in("id", ids);
    postIds = ids;
  }
  const { data: posts, error } = await q;
  if (error) throw error;
  const rows = (posts ?? []) as any[];
  if (rows.length === 0) return [];

  const ids = rows.map((p) => p.id);
  const authorIds = Array.from(new Set(rows.map((p) => p.author_id)));

  const [profilesRes, glowsRes, commentsRes, myGlowsRes, myBookmarksRes] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds),
    supabase.from("glows").select("post_id").in("post_id", ids),
    supabase.from("comments").select("post_id").in("post_id", ids),
    userId ? supabase.from("glows").select("post_id").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
    userId ? supabase.from("bookmarks").select("post_id").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
  ]);

  const profileMap = new Map<string, any>();
  for (const p of (profilesRes.data ?? []) as any[]) profileMap.set(p.id, p);
  const glowCount = new Map<string, number>();
  for (const g of (glowsRes.data ?? []) as any[]) glowCount.set(g.post_id, (glowCount.get(g.post_id) ?? 0) + 1);
  const commentCount = new Map<string, number>();
  for (const c of (commentsRes.data ?? []) as any[]) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  const mineGlow = new Set<string>(((myGlowsRes as any).data ?? []).map((x: any) => x.post_id));
  const mineBk = new Set<string>(((myBookmarksRes as any).data ?? []).map((x: any) => x.post_id));

  return rows.map((p) => ({
    id: p.id, title: p.title, body: p.body, category: p.category, is_anonymous: p.is_anonymous,
    created_at: p.created_at,
    author: profileMap.get(p.author_id) ?? null,
    glow_count: glowCount.get(p.id) ?? 0,
    comment_count: commentCount.get(p.id) ?? 0,
    i_glowed: mineGlow.has(p.id),
    i_bookmarked: mineBk.has(p.id),
  }));
}