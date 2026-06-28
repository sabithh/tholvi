import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Heart, MessageCircle, Sparkles, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { timeAgo } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — THOLVI" }] }),
  component: NotificationsPage,
});

type Notif = { id: string; type: string; actor_id: string | null; post_id: string | null; read: boolean; created_at: string; actor?: any };

function iconFor(t: string) {
  if (t === "glow") return Sparkles;
  if (t === "comment") return MessageCircle;
  if (t === "follow") return UserPlus;
  if (t === "message") return Heart;
  return Bell;
}
function labelFor(t: string) {
  switch (t) {
    case "glow": return "glowed your story";
    case "comment": return "commented on your story";
    case "follow": return "started following you";
    case "message": return "sent you a message";
    default: return "did something";
  }
}

function NotificationsPage() {
  const { user } = useCurrentUser();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("notifications")
        .select("id,type,actor_id,post_id,read,created_at").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(80);
      const list = (data ?? []) as Notif[];
      const actorIds = Array.from(new Set(list.map((n) => n.actor_id).filter(Boolean) as string[]));
      if (actorIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", actorIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        list.forEach((n) => { if (n.actor_id) n.actor = map.get(n.actor_id); });
      }
      setItems(list);
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    };
    load();
    const ch = supabase.channel("notif").on("postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-display text-white">Notifications</h1>
      {items.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-white/55">No notifications yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = iconFor(n.type);
            const content = (
              <div className={`glass rounded-2xl p-4 flex items-center gap-3 ${!n.read ? "border-violet-400/30" : ""}`}>
                <div className="h-10 w-10 rounded-full bg-violet-500/20 grid place-items-center">
                  <Icon className="h-5 w-5 text-violet-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-semibold">{n.actor?.display_name ?? "Someone"}</span>{" "}
                    <span className="text-white/65">{labelFor(n.type)}</span>
                  </p>
                  <p className="text-xs text-white/45 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
            return n.post_id ? (
              <Link key={n.id} to="/post/$id" params={{ id: n.post_id }}>{content}</Link>
            ) : n.actor ? (
              <Link key={n.id} to="/u/$username" params={{ username: n.actor.username }}>{content}</Link>
            ) : <div key={n.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}