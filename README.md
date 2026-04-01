# Flukavike

A native-feeling mobile client for [Fluxer](https://fluxer.app) — the open-source Discord alternative — built with Ionic Framework, React, TypeScript, and Capacitor.

---

## Design

| Inspiration | What it contributes |
|---|---|
| **Fluxer PWA / Discord** | 5-layer dark color system, blurple accent, message layout, server/channel structure |
| **Ivory by Tapbots** | Spring physics animations, pill tab bar, ephemeral hover controls, haptic feedback, skeleton loading, no dead affordances |

---

## Stack

| Layer | Technology |
|---|---|
| UI Framework | Ionic React + TypeScript |
| Native Bridge | Capacitor 6 |
| HTTP | `CapacitorHttp` (native URLSession/OkHttp — bypasses WebView CORS) |
| Storage | `@capacitor/preferences` (token + settings) |
| Haptics | `@capacitor/haptics` |
| Splash | `@capacitor/splash-screen` (manually hidden after auth check) |
| Real-time | Native WebSocket → Fluxer Gateway |

---

## Getting Started

```bash
npm install
ionic serve              # browser dev server
```

### Native builds

```bash
npx cap add ios && npx cap add android   # first time only
npx cap sync                              # after any capacitor config change
npx cap run ios                           # iOS simulator or device
npx cap run android                       # Android device/emulator
```

### Splash screen asset

Place a `2732×2732px` PNG at `resources/splash.png` (dark `#1e1f22` background, centred Fluxer logo), then run:

```bash
npx @capacitor/assets generate --ios --android
```

---

## Self-Hosted Instances

On the login screen, expand **Advanced** and enter your instance base URL (e.g. `https://chat.mycompany.com`). This mirrors the desktop client's `settings.json` `app_url` key and is persisted across app restarts via Capacitor Preferences.

---

## Auth Architecture

```
POST /auth/login
  ├── { mfa: false, token, user_id }  → store token → GET /users/@me → Home
  ├── { mfa: true, ticket, totp, sms, webauthn } → MFA step → store token → Home
  └── { pending_verification: true }  → IP auth email sent → show message
```

Token is stored as a bare string in Capacitor Preferences (`fluxer_auth_token`) and injected as `Authorization: <token>` on every request. All HTTP goes through `CapacitorHttp` (native layer) — no CORS, no cookie issues.

Splash screen stays visible until `validateSession()` resolves (success or fail), then fades out (300ms) directly into the correct screen. No white flash.

---

## Project Structure

```
src/
├── types/fluxer.ts          — all shared TypeScript interfaces
├── services/
│   ├── tokenStore.ts        — Preferences CRUD (no circular deps)
│   ├── settings.ts          — app_url persistence
│   ├── discovery.ts         — /.well-known/fluxer + 5-min cache
│   ├── http.ts              — CapacitorHttp wrapper + rate limit retry
│   └── auth.ts              — login / MFA / validate / logout
├── contexts/AuthContext.tsx — useReducer state machine
├── hooks/useAuth.ts         — public hook for all components
├── theme/
│   ├── variables.css        — design tokens (colors, motion, radii)
│   └── global.css           — resets, animations, Ionic overrides
├── components/
│   ├── layout/              — AppShell, ServerRail, ChannelSidebar, BottomTabBar
│   ├── chat/                — MessageList, MessageItem, MessageInput, MessageReactions
│   └── ui/                  — Avatar, StatusDot, SkeletonMessage
└── pages/
    ├── Login.tsx            — email/password + inline MFA + advanced server URL
    ├── Home.tsx             — main channel view
    └── DirectMessages.tsx   — DM list
```

---

## Architecture Notes

See [PLAN.md](./PLAN.md) for the full implementation plan, API integration details, and critical gotchas.
