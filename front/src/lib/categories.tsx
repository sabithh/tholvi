import { Briefcase, Folder, Heart, Megaphone, ShoppingBag, TrendingUp, Users, type LucideIcon } from "lucide-react";

export type Category = "tech" | "finance" | "marketing" | "freelance" | "relationships" | "health" | "general";

export const CATEGORIES: { value: Category; label: string; icon: LucideIcon; tint: string }[] = [
  { value: "tech", label: "Tech", icon: Briefcase, tint: "from-sky-500/30 to-indigo-500/20" },
  { value: "finance", label: "Finance", icon: ShoppingBag, tint: "from-emerald-500/30 to-teal-500/20" },
  { value: "marketing", label: "Marketing", icon: Megaphone, tint: "from-orange-500/30 to-rose-500/20" },
  { value: "freelance", label: "Freelance", icon: Users, tint: "from-violet-500/30 to-fuchsia-500/20" },
  { value: "relationships", label: "Relationships", icon: Heart, tint: "from-pink-500/30 to-rose-500/20" },
  { value: "health", label: "Health", icon: TrendingUp, tint: "from-lime-500/30 to-emerald-500/20" },
  { value: "general", label: "General", icon: Folder, tint: "from-slate-500/30 to-zinc-500/20" },
];

export function categoryMeta(c: Category | string | null | undefined) {
  return CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}