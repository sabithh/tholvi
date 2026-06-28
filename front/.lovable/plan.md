
# THOLVI — Production-Ready Upgrade Plan

Right now THOLVI is a single-file in-memory prototype. To make it production-ready I'll add real authentication, a real database, and the missing social surfaces (Search, Notifications, Messages, Following) — all kept in the same dark glassmorphism aesthetic.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud and create these tables (all with RLS + grants):

- `profiles` — id (→ auth.users), username, display_name, avatar_url, bio, anonymous_default
- `posts` — id, author_id, title, body, category, lessons_learned, is_anonymous, created_at
- `glows` (likes) — post_id, user_id (unique)
- `bookmarks` — post_id, user_id (unique)
- `comments` — id, post_id, author_id, body, is_anonymous, created_at
- `follows` — follower_id, following_id (unique)
- `notifications` — id, user_id, type (glow/comment/follow), actor_id, post_id, read, created_at
- `conversations` + `messages` — direct messaging between users
- `user_roles` + `app_role` enum + `has_role()` (per security rules)

Triggers: auto-create profile on signup; auto-create notification on new glow/comment/follow.

## 2. Authentication

- Email + password and Google sign-in (Lovable Cloud defaults)
- `/auth` page (sign in / sign up tabs), glass-styled
- `_authenticated` layout gates Home, Notifications, Messages, New Post, Profile
- Public routes: `/auth`, `/post/$id` (read-only for non-logged-in), landing teaser
- Sign out clears query cache and redirects

## 3. Routes (TanStack Start file-based)

```
/auth                         sign in / sign up
/                             landing (public teaser if logged out, feed if logged in)
/_authenticated/feed          Home feed (For You / Following tabs)
/_authenticated/search        Search posts + people
/_authenticated/notifications Notifications list
/_authenticated/messages      Conversation list
/_authenticated/messages/$id  Conversation thread
/_authenticated/new           New post + live preview
/_authenticated/bookmarks     Saved posts
/post/$id                     Post detail (public read)
/u/$username                  Profile (public)
/settings                     Account settings
```

Each route has its own `head()` meta (title + description + og tags).

## 4. UI surfaces

**Left sidebar (glass, fixed):** Logo, Home, Search, Notifications (badge), Messages (badge), Bookmarks, Profile, New Post (CTA), Sign Out at bottom. Collapses to icon bar on tablet, bottom nav on mobile.

**Home feed:** Tabs "For You" / "Following" + category filter chips. Real-time-ish via TanStack Query refetch. Infinite scroll.

**Search:** Single search box, tabs: Posts / People / Categories. Debounced query against `posts` (title/body ilike) and `profiles` (username/display_name ilike). Follow button inline on people results.

**Notifications:** Grouped by day. Mark-all-read button. Realtime subscription (Supabase channel) for new rows.

**Messages:** Two-pane on desktop (conversation list + thread), stacked on mobile. Realtime subscription on `messages`. Send box at bottom of thread.

**Profile (`/u/$username`):** Avatar, bio, stats (Failures shared, Glows received, Followers, Following), Follow/Unfollow button, tabs (Posts / Glows / Bookmarks). Edit Profile button when it's your own.

**New Post:** Glass form with live preview, category select, lessons-learned field, anonymous toggle (persisted as default in profile if user opts in).

**Post Detail:** Story body, gold-tinted "Lessons Learned" panel, glow + bookmark + share, comments thread with anonymous toggle.

## 5. Server functions / data layer

- TanStack Query everywhere (`ensureQueryData` in loaders, `useSuspenseQuery` in components)
- `createServerFn` for any write that needs server validation; otherwise use the browser Supabase client (RLS enforces auth)
- Realtime via `supabase.channel(...)` for notifications + active message thread

## 6. Polish

- Skeleton loaders matching glass cards
- Empty states for each surface
- Toasts for follow/unfollow, glow, bookmark, post created, message sent
- Keyboard: `/` focuses search, `n` opens new post
- SEO: per-route `head()`, sitemap-friendly public routes
- Accessibility: focus rings on glass elements, aria-labels on icon buttons

## 7. What I will NOT do unless you ask

- Image/file uploads for posts (text-only first; we can add storage after)
- Direct messaging encryption
- Push notifications / email digests
- Payments / premium tiers

## Confirm before I build

1. **Auth methods:** Email/password + Google — OK? (or email-only / add Apple)
2. **Anonymous posting scope:** anonymous to other users but admins can see author — OK? (full anonymity means no moderation)
3. **Messages:** include for v1, or ship without and add later?
4. **Landing page for logged-out users:** keep current feed-preview style, or build a proper marketing landing?

Reply with answers (or "go with defaults") and I'll switch to build mode and implement.
