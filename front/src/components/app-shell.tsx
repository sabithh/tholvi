import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Bell, Bookmark, Home, LogOut, MessageCircle, PenSquare, Search, Settings, User as UserIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import tholviLogo from "@/assets/tholvi-logo.png";

function NavItem({
  to, params, icon: Icon, label, badge, active,
}: { to: string; params?: any; icon: any; label: string; badge?: number; active?: boolean }) {
  return (
    <Link
      to={to}
      params={params}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
        active
          ? "bg-white/10 text-white border border-white/15 shadow-[0_0_30px_-12px_rgba(168,85,247,0.5)]"
          : "text-white/65 hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-violet-500/80 px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile } = useCurrentUser();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const qc = useQueryClient();
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [n, m] = await Promise.all([
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("read", false),
      ]);
      setNotifCount(n.count ?? 0);
      setMsgCount(m.count ?? 0);
    };
    load();
    const ch = supabase
      .channel("shell-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/", icon: Home, label: "Home", authRequired: false },
    { to: "/search", icon: Search, label: "Search", authRequired: true },
    { to: "/notifications", icon: Bell, label: "Notifications", badge: notifCount, authRequired: true },
    { to: "/messages", icon: MessageCircle, label: "Messages", badge: msgCount, authRequired: true },
    { to: "/bookmarks", icon: Bookmark, label: "Bookmarks", authRequired: true },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-72 z-30 p-4">
        <div className="glass rounded-3xl flex flex-col w-full p-4">
          <Link to="/" className="flex items-center gap-3 px-3 py-3 mb-2">
            <div className="h-11 w-11 rounded-full bg-white grid place-items-center overflow-hidden glow-violet shrink-0">
              <img src={tholviLogo} alt="THOLVI" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[1.35rem] text-white leading-none">THOLVI</div>
              <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1">Share your fails · Inspire others</div>
            </div>
          </Link>

          <nav className="flex flex-col gap-1 mt-2">
            {nav.map((n) => (
              <NavItem
                key={n.to}
                {...n}
                to={n.to}
                active={n.to === "/" ? path === "/" : path === n.to || path.startsWith(n.to + "/")}
              />
            ))}
            {profile && (
              <NavItem
                to="/u/$username"
                params={{ username: profile.username }}
                icon={UserIcon}
                label="Profile"
                active={path === `/u/${profile.username}`}
              />
            )}
            <NavItem to="/settings" icon={Settings} label="Settings" active={path === "/settings"} />
          </nav>

          <Link
            to="/new"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl gradient-violet text-white font-semibold py-3 glow-violet hover:brightness-110 transition"
          >
            <PenSquare className="h-4 w-4" /> Share a failure
          </Link>

          <div className="mt-auto pt-4 border-t border-white/10">
            {profile ? (
              <div className="flex items-center gap-3 px-2">
                <div className="h-9 w-9 rounded-full bg-white/10 grid place-items-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-white">{profile.display_name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{profile.display_name}</div>
                  <div className="text-xs text-white/50 truncate">@{profile.username}</div>
                </div>
                <button onClick={handleSignOut} aria-label="Sign out" className="text-white/50 hover:text-white">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium py-2.5 hover:bg-white/10 transition"
              >
                Sign in / Create account
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-72 min-h-screen pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">{children}</div>
      </main>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-30 glass rounded-2xl px-2 py-2 flex justify-around">
        {[
          { to: "/", icon: Home, label: "Home", authRequired: false },
          { to: "/search", icon: Search, label: "Search", authRequired: true },
          { to: "/new", icon: PenSquare, label: "Post", authRequired: false },
          { to: "/notifications", icon: Bell, label: "Alerts", badge: notifCount, authRequired: true },
          { to: "/messages", icon: MessageCircle, label: "DMs", badge: msgCount, authRequired: true },
        ].map((n) => {
          const active = path === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl ${
                active ? "text-white bg-white/10" : "text-white/60"
              }`}
            >
              <n.icon className="h-5 w-5" />
              <span className="text-[10px]">{n.label}</span>
              {n.badge && n.badge > 0 ? (
                <span className="absolute top-0.5 right-2 h-1.5 w-1.5 rounded-full bg-violet-400" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}