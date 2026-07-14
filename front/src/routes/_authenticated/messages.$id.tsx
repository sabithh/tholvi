import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  component: ThreadPage,
});

function ThreadPage() {
  const { id: peerId } = Route.useParams();
  const { user } = useCurrentUser();
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", peerId).maybeSingle().then(({ data }) => setPeer(data));
  }, [peerId]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("messages")
        .select("id,sender_id,recipient_id,body,created_at,read")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true }).limit(200);
      setMsgs(data ?? []);
      await supabase.from("messages").update({ read: true })
        .eq("recipient_id", user.id).eq("sender_id", peerId).eq("read", false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    load();
    const ch = supabase.channel(`thread-${peerId}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, peerId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: peerId, body: text });
    if (error) toast.error(error.message);
  }

  return (
    <div className="glass rounded-3xl flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <Link to="/messages" className="md:hidden text-white/60"><ArrowLeft className="h-5 w-5" /></Link>
        {peer && (
          <Link to="/u/$username" params={{ username: peer.username }} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/10 grid place-items-center overflow-hidden">
              {peer.avatar_url ? <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" /> :
                <span className="text-white font-semibold text-sm">{peer.display_name[0]?.toUpperCase()}</span>}
            </div>
            <div>
              <div className="text-white text-sm">{peer.display_name}</div>
              <div className="text-white/45 text-xs">@{peer.username}</div>
            </div>
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                mine ? "gradient-violet text-white" : "glass text-white"
              }`}>{m.body}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-white/10 flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…"
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400/50" />
        <button type="submit" className="rounded-2xl gradient-violet px-4 text-white">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}