import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { timeAgo } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — THOLVI" }] }),
  component: MessagesLayout,
});

type Convo = { peer: any; last: string; at: string; unread: number };

function MessagesLayout() {
  const { user } = useCurrentUser();
  const [convos, setConvos] = useState<Convo[]>([]);
  const loc = useLocation();
  const inThread = /\/messages\/.+/.test(loc.pathname);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: msgs } = await supabase.from("messages")
        .select("id,sender_id,recipient_id,body,read,created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(200);
      const map = new Map<string, Convo>();
      for (const m of (msgs ?? []) as any[]) {
        const peerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        const existing = map.get(peerId);
        if (!existing) {
          map.set(peerId, { peer: { id: peerId }, last: m.body, at: m.created_at, unread: !m.read && m.recipient_id === user.id ? 1 : 0 });
        } else if (!m.read && m.recipient_id === user.id) existing.unread++;
      }
      const peerIds = Array.from(map.keys());
      if (peerIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", peerIds);
        for (const p of (profs ?? []) as any[]) {
          const c = map.get(p.id); if (c) c.peer = p;
        }
      }
      setConvos(Array.from(map.values()));
    };
    load();
    const ch = supabase.channel("msgs-list").on("postgres_changes",
      { event: "*", schema: "public", table: "messages" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <div>
      {!inThread && <h1 className="text-4xl font-display text-white mb-5">Messages</h1>}
      <div className={`grid gap-4 ${inThread ? "md:grid-cols-[280px_1fr]" : ""}`}>
        <div className={`space-y-2 ${inThread ? "hidden md:block" : ""}`}>
          {convos.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center text-white/55 text-sm">No conversations yet. Find people in Search and say hi.</div>
          ) : convos.map((c) => (
            <Link key={c.peer.id} to="/messages/$id" params={{ id: c.peer.id }}
              className="block glass glass-hover rounded-2xl p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center overflow-hidden">
                {c.peer.avatar_url ? <img src={c.peer.avatar_url} alt="" className="h-full w-full object-cover" /> :
                  <span className="text-white font-semibold text-sm">{(c.peer.display_name ?? "?")[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-white truncate">{c.peer.display_name ?? "User"}</span>
                  <span className="text-[10px] text-white/40 flex-shrink-0">{timeAgo(c.at)}</span>
                </div>
                <div className="text-xs text-white/55 truncate">{c.last}</div>
              </div>
              {c.unread > 0 && <span className="h-2 w-2 rounded-full bg-violet-400" />}
            </Link>
          ))}
        </div>
        {inThread && <Outlet />}
      </div>
    </div>
  );
}