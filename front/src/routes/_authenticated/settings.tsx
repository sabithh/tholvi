import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, ExternalLink } from "lucide-react";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAnon(profile.anonymous_default);
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be smaller than 2 MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;

      // Upload to Supabase Storage (bucket: avatars)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Add cache buster so the img element refreshes
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Save to profile
      const { error: updateError } = await supabase.from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated!");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || profile?.display_name,
      bio,
      anonymous_default: anon,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-display text-white">Settings</h1>
        {profile && (
          <Link
            to="/u/$username"
            params={{ username: profile.username }}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View profile
          </Link>
        )}
      </div>

      {/* Avatar */}
      <div className="glass rounded-3xl p-5">
        <div className="text-xs uppercase tracking-wider text-white/50 mb-4">Profile photo</div>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="h-20 w-20 rounded-full bg-white/10 overflow-hidden grid place-items-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            {/* Overlay */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="glass rounded-2xl px-4 py-2 text-sm text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <p className="text-xs text-white/40 mt-1.5">JPG, PNG or WebP · max 2 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Profile info form */}
      <form onSubmit={save} className="glass rounded-3xl p-5 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-400/50"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-white/50">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={200}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-400/50 resize-none"
          />
          <div className="text-right text-[10px] text-white/30 mt-0.5">{bio.length}/200</div>
        </div>
        <label className="flex items-center justify-between glass rounded-2xl px-4 py-3 cursor-pointer">
          <span className="text-sm text-white">Post anonymously by default</span>
          <input
            type="checkbox"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
            className="accent-violet-500 h-4 w-4"
          />
        </label>
        <button
          disabled={saving}
          className="w-full sm:w-auto gradient-violet text-white font-semibold px-5 py-2.5 rounded-2xl glow-violet disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}