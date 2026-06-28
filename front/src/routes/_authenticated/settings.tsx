import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — THOLVI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile } = useCurrentUser();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [anon, setAnon] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) { setDisplayName(profile.display_name); setBio(profile.bio ?? ""); setAnon(profile.anonymous_default); }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName, bio, anonymous_default: anon,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-display text-white">Settings</h1>
      <form onSubmit={save} className="glass rounded-3xl p-5 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-400/50" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-400/50 resize-none" />
        </div>
        <label className="flex items-center justify-between glass rounded-2xl px-4 py-3">
          <span className="text-sm text-white">Post anonymously by default</span>
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="accent-violet-500 h-4 w-4" />
        </label>
        <button disabled={saving} className="gradient-violet text-white font-semibold px-5 py-2.5 rounded-2xl glow-violet disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}