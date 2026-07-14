import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import tholviLogo from "@/assets/tholvi-logo-transparent.png";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset Password — THOLVI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase sends the token in the URL hash — we need to let the client
  // pick up the session from the hash before we allow the form to show.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also check if there's already a session (in case the event already fired)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated! Please sign in.");
    setDone(true);
    setTimeout(() => router.navigate({ to: "/auth", replace: true }), 2000);
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src={tholviLogo}
            alt="THOLVI"
            className="w-28 h-auto object-contain invert drop-shadow-[0_0_25px_rgba(168,85,247,0.45)] mb-3"
          />
        </div>

        {done ? (
          <div className="text-center space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-white font-semibold">Password updated!</p>
            <p className="text-sm text-white/55">Redirecting to sign in…</p>
          </div>
        ) : !ready ? (
          <div className="text-center space-y-3">
            <div className="text-3xl">⏳</div>
            <p className="text-white font-semibold">Verifying your reset link…</p>
            <p className="text-sm text-white/55">
              If nothing happens, your link may have expired.{" "}
              <button onClick={() => router.navigate({ to: "/auth" })}
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                Request a new one
              </button>
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-display text-white mb-1">Set new password</h1>
            <p className="text-sm text-white/55 mb-6">Choose a strong password for your account.</p>
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400/50"
              />
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400/50"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-violet text-white font-semibold py-3 rounded-2xl glow-violet hover:brightness-110 disabled:opacity-50 transition"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
