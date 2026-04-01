# Plan: Flukavike — Fluxer Ionic/Capacitor Mobile Client

## Context

Building a Fluxer mobile client using Ionic (React + TypeScript) + Capacitor. A prior native Swift attempt failed because mobile WebViews and native HTTP clients drop cookies or get blocked by CORS. The fix: enable `CapacitorHttp` — it intercepts all `fetch()` calls and routes them through native iOS `URLSession` / Android `OkHttp`, bypassing WebView CORS entirely.

Fluxer auth is **purely token-based** (not cookie-based for regular sessions). The server returns a bare token string on `/auth/login`. There is no CSRF mechanism on auth endpoints. The only cookies are short-lived sudo-mode cookies (`__flx_sudo`) which are irrelevant for the mobile client.

---

## Verified API Facts (from server source + docs)

**Login endpoint:** `POST /auth/login`
- Body: `{ email, password, inviteCode? }`
- **Success response:** `{ mfa: false, user_id: string, token: string, pending_verification?: boolean }`
- **MFA required response:** `{ mfa: true, ticket: string, sms: boolean, totp: boolean, webauthn: boolean }`

**Auth header:** `Authorization: <bare-token>` (raw token, no "Bearer" prefix for user sessions)
> Also accepts `Bearer <token>` and `Bot <token>` but user sessions use bare token.

**MFA endpoints:**
- `POST /auth/login/mfa/totp` — `{ ticket, code }` → `{ token, userId }`
- `POST /auth/login/mfa/sms` — same shape
- Ticket TTL: **5 minutes**, stored server-side in cache

**Validation:** `GET /users/@me` with auth header → full `FluxerUser` profile

**WebSocket IDENTIFY payload:**
```json
{ "token": "<token>", "properties": { "os": "ios", "browser": "Fluxer Mobile", "device": "Fluxer Mobile" } }
```

**IP Authorization edge case:** When MFA is disabled and IP is unrecognized, server sends an authorization email before granting a session. Client must surface a "check your email" message.

---

## Settings / Instance Configuration

The desktop client reads `settings.json` with an `app_url` key for self-hosted instances. The mobile equivalent stores this in **Capacitor Preferences** under the key `fluxer_app_url`.

**New file: `src/services/settings.ts`**

```typescript
import { Preferences } from '@capacitor/preferences';

const APP_URL_KEY = 'fluxer_app_url';
const DEFAULT_APP_URL = 'https://fluxer.app'; // discovery origin (not the API base directly)

export async function getAppUrl(): Promise<string> {
  const { value } = await Preferences.get({ key: APP_URL_KEY });
  return value ?? DEFAULT_APP_URL;
}

export async function setAppUrl(url: string): Promise<void> {
  const normalized = url.replace(/\/$/, ''); // strip trailing slash
  await Preferences.set({ key: APP_URL_KEY, value: normalized });
}

export async function clearAppUrl(): Promise<void> {
  await Preferences.remove({ key: APP_URL_KEY });
}
```

**Integration points:**
- `discovery.ts`: replace hardcoded `'https://fluxer.app'` default with `await getAppUrl()` so all endpoint resolution flows from the persisted setting
- `auth.ts`: `login()` / `validateSession()` / `logout()` all call `getAppUrl()` internally via discovery — no call-site changes needed
- `Login.tsx`: add a collapsible "Advanced / Custom Server" section with an `IonInput` for the URL. On change, call `setAppUrl()` and invalidate the discovery cache (`clearDiscoveryCache()`). Show the current value pre-filled from `getAppUrl()`.

**UI placement in Login.tsx:**
```tsx
<IonItem lines="none" button onClick={() => setShowAdvanced(v => !v)}>
  <IonLabel color="medium">Advanced</IonLabel>
  <IonIcon slot="end" icon={showAdvanced ? chevronUp : chevronDown} />
</IonItem>
{showAdvanced && (
  <IonItem>
    <IonLabel position="floating">Server URL</IonLabel>
    <IonInput
      value={serverUrl}
      placeholder="https://fluxer.app"
      type="url"
      onIonChange={e => setServerUrl(e.detail.value!)}
      onIonBlur={() => { setAppUrl(serverUrl); clearDiscoveryCache(); }}
    />
  </IonItem>
)}
```

This matches the desktop semantics: the stored URL is the **trusted origin** used for all API discovery and requests, defaulting to the public instance.

---

## Phase 0: Project Scaffolding

```bash
# In /Users/andrew/flukavike-ionicframework-
ionic start . blank --type=react --capacitor
npx cap init "Fluxer" "app.fluxer.mobile" --web-dir=build
npm install @capacitor/preferences @capacitor/ios @capacitor/android
npx cap add ios && npx cap add android
```

---

## File Structure

```
src/
├── types/fluxer.ts
├── services/
│   ├── tokenStore.ts
│   ├── settings.ts
│   ├── discovery.ts
│   ├── http.ts
│   └── auth.ts
├── contexts/AuthContext.tsx
├── hooks/useAuth.ts
├── theme/
│   ├── variables.css            ← Full design token system (Discord palette + Ivory refinement)
│   └── global.css               ← Base resets, typography, animations
├── pages/
│   ├── Login.tsx                ← Email/password + inline MFA step
│   ├── Home.tsx                 ← Main app shell (channel view)
│   └── DirectMessages.tsx       ← DM list view
├── components/
│   ├── ProtectedRoute.tsx
│   ├── layout/
│   │   ├── AppShell.tsx         ← Root split-pane layout manager
│   │   ├── ServerRail.tsx       ← Left pill-icon guild list (Discord-style squircles)
│   │   ├── ChannelSidebar.tsx   ← Channel list with collapsible categories
│   │   └── BottomTabBar.tsx     ← Ivory-style tab bar with animated pill indicator
│   ├── chat/
│   │   ├── MessageList.tsx      ← Virtualized message feed
│   │   ├── MessageItem.tsx      ← Single message row (grouped, coalesced)
│   │   ├── MessageInput.tsx     ← Floating composer bar
│   │   └── MessageReactions.tsx ← Emoji reaction pill chips
│   └── ui/
│       ├── Avatar.tsx           ← Rounded avatar with status dot
│       ├── StatusDot.tsx        ← Online/idle/DND/offline indicator
│       └── SkeletonMessage.tsx  ← Loading shimmer placeholders
README.md
PLAN.md                          ← Copy of this plan for offline reference
```

---

---

## Design System

### Inspiration
- **Discord PWA / Fluxer web** — overall layout, color palette, message anatomy
- **Ivory by Tapbots** — refined typography, spring animations, pill tab bar, generous whitespace, frosted glass surfaces, haptic feedback patterns

### Color Tokens — `src/theme/variables.css`

```css
:root {
  /* Backgrounds — Discord layer system */
  --flx-bg-primary:    #313338;   /* main content area */
  --flx-bg-secondary:  #2b2d31;   /* channel sidebar */
  --flx-bg-tertiary:   #1e1f22;   /* server rail */
  --flx-bg-surface:    #383a40;   /* inputs, cards */
  --flx-bg-elevated:   #404249;   /* modals, tooltips */
  --flx-bg-overlay:    rgba(0,0,0,0.7);

  /* Accent — Discord blurple */
  --flx-accent:        #5865f2;
  --flx-accent-hover:  #4752c4;
  --flx-accent-light:  rgba(88,101,242,0.15);

  /* Text */
  --flx-text-primary:   #f2f3f5;
  --flx-text-secondary: #b5bac1;
  --flx-text-muted:     #80848e;
  --flx-text-link:      #00a8fc;

  /* Status */
  --flx-status-online:  #23a55a;
  --flx-status-idle:    #f0b232;
  --flx-status-dnd:     #f23f43;
  --flx-status-offline: #80848e;

  /* Semantic */
  --flx-separator:      rgba(255,255,255,0.06);
  --flx-mention-bg:     rgba(250,168,26,0.1);
  --flx-mention-border: #faa81a;

  /* Ivory-inspired motion */
  --flx-spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --flx-spring-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --flx-duration-fast: 180ms;
  --flx-duration-base: 280ms;

  /* Radii */
  --flx-radius-sm:   4px;
  --flx-radius-md:   8px;
  --flx-radius-lg:   16px;
  --flx-radius-pill: 9999px;

  /* Override Ionic defaults */
  --ion-background-color: var(--flx-bg-primary);
  --ion-text-color:       var(--flx-text-primary);
  --ion-color-primary:    var(--flx-accent);
  --ion-toolbar-background: var(--flx-bg-secondary);
  --ion-tab-bar-background: var(--flx-bg-tertiary);
  --ion-item-background:    transparent;
  --ion-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}
```

### Key Component Designs

**`ServerRail.tsx`** — Fixed left column (64px wide) on tablet; hidden behind swipe gesture on phone
- Squircle guild icons (border-radius morphs from 50% → 30% on hover/active, via CSS transition — Ivory-inspired)
- Active indicator: animated blurple pill on the left edge
- Unread indicator: small white dot bottom-right
- Add Server button at bottom with `+` in dashed circle

**`ChannelSidebar.tsx`** — 240px panel
- Category headers: `UPPERCASE 11px` muted text with `▸` collapse chevron
- Channel rows: `#channel-name` with `#` or voice icon, muted by default, primary color when active
- Hover state: subtle `--flx-bg-surface` background, 4px radius
- Current user info bar at bottom: avatar + username + mute/deafen/settings icons

**`MessageList.tsx`** — Performance-critical
- Use CSS `content-visibility: auto` on message groups for paint optimization
- Group consecutive messages from same author within 7 minutes (hide avatar/name for grouped messages)
- Timestamp: relative (`2 minutes ago`) on hover becomes absolute (`Today at 3:42 PM`)
- New message divider: horizontal line with "New Messages" badge in accent color
- Scroll-to-bottom FAB appears when not at bottom

**`MessageItem.tsx`** — Single message
- Layout: `[avatar 40px] [content column]`
- Grouped: `[40px gap] [content]` (no avatar repeat)
- Username in bold `--flx-text-primary`, timestamp in `12px --flx-text-muted`
- Message text in `16px --flx-text-secondary`, links in `--flx-text-link`
- Hover reveals action bar (emoji, reply, more) floating top-right — Ivory-style ephemeral controls

**`MessageInput.tsx`** — Floating composer
- Background: `--flx-bg-surface`, `border-radius: 8px`, `margin: 8px 16px`
- Left: `+` attachment button, Right: emoji + GIF + send
- Auto-grows vertically up to 10 lines, then scrolls
- When empty: send button hidden (Ivory detail — no dead affordances)

**`BottomTabBar.tsx`** — Ivory-inspired
- 4 tabs: Home (servers), DMs, Mentions, You (profile)
- Active tab: animated blurple pill background slides between tabs via CSS transform
- Icons: outlined → filled on active, with spring scale animation (`--flx-spring-bounce`)
- Badge on DMs and Mentions for unread counts

**`Avatar.tsx`**
- Squircle shape: `border-radius: 50%` with `clip-path: url(#squircle)` or just rounded
- `StatusDot` absolutely positioned bottom-right: 10px dot with white 2px border, color from status
- Sizes: `sm` (24px), `md` (40px), `lg` (80px)

**`SkeletonMessage.tsx`** — Loading state
- Shimmer animation via CSS `@keyframes` on `linear-gradient` background-position
- Ivory-style: gentle, slow pulse (1.5s) rather than harsh flash

### Login Page Design
- **Full-screen dark background** with subtle radial gradient: `radial-gradient(ellipse at 30% 20%, rgba(88,101,242,0.15) 0%, transparent 60%)`
- Centered card (`max-width: 400px`): `--flx-bg-elevated`, `border-radius: 16px`, `box-shadow: 0 8px 32px rgba(0,0,0,0.4)`
- Fluxer logo at top (use SVG)
- Inputs: `--flx-bg-surface` background, `border: 1px solid var(--flx-separator)`, focus ring in `--flx-accent`
- Sign In button: full-width, `--flx-accent` background, bold text, `border-radius: 4px`
- Error state: input border turns `--flx-status-dnd`, shake animation (`@keyframes shake`)
- MFA step slides in from right (`transform: translateX(100%)` → `translateX(0)`, spring easing)

### Animation Principles (Ivory-inspired)
1. **Spring physics** for all interactive element state changes (scale, translate)
2. **No linear easing** anywhere — everything uses `ease-out` minimum, spring preferred
3. **Haptic feedback** via `Haptics` from `@capacitor/haptics` on: send message, tab switch, reaction add
4. **Stagger** new messages entering from bottom (15ms delay per item)
5. **Skeleton screens** instead of spinners for content loading

---

## Implementation Steps

### 1. `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.fluxer.mobile',
  appName: 'Fluxer',
  webDir: 'build',
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,   // ← THE critical flag. Routes all fetch() through native HTTP.
    },
  },
};
export default config;
```

Run `npx cap sync` after every edit to this file.

---

### 2. `src/types/fluxer.ts`

Key corrections vs. Dart SDK (use **actual server response shapes**):

```typescript
// Login — server returns `mfa` discriminant boolean
export interface LoginSuccessResponse {
  mfa: false;
  user_id: string;
  token: string;
  pending_verification?: boolean;
}
export interface LoginMfaRequiredResponse {
  mfa: true;
  ticket: string;
  sms: boolean;
  totp: boolean;
  webauthn: boolean;
}
export type LoginResponse = LoginSuccessResponse | LoginMfaRequiredResponse;

export type MfaMethod = 'totp' | 'sms' | 'webauthn';

export interface FluxerUser {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  avatar?: string | null;
  flags?: number;
}

export class FluxerHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly retryAfter?: number,
  ) { super(message); }
}

export type AuthStateName =
  | 'initializing'       // App boot: checking stored token
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'mfa_required'
  | 'ip_auth_required'   // Edge case: unrecognized IP, check email
  | 'error';

// Narrowing helpers
export const isLoginSuccess = (r: LoginResponse): r is LoginSuccessResponse => !r.mfa;
export const isMfaRequired  = (r: LoginResponse): r is LoginMfaRequiredResponse => r.mfa;
```

---

### 3. `src/services/tokenStore.ts`

Micro-module to break `http.ts ↔ auth.ts` circular dependency.  
`@capacitor/preferences` stores **strings only** — no JSON needed here since token/userId are already strings.

```typescript
import { Preferences } from '@capacitor/preferences';
const TOKEN_KEY = 'fluxer_auth_token';
const USER_ID_KEY = 'fluxer_user_id';
export const getStoredToken  = async () => (await Preferences.get({ key: TOKEN_KEY })).value;
export const setStoredToken  = async (token: string, userId: string) => {
  await Preferences.set({ key: TOKEN_KEY, value: token });
  await Preferences.set({ key: USER_ID_KEY, value: userId });
};
export const clearStoredToken = async () => {
  await Preferences.remove({ key: TOKEN_KEY });
  await Preferences.remove({ key: USER_ID_KEY });
};
```

---

### 4. `src/services/discovery.ts`

- Calls `GET /.well-known/fluxer`, caches in-module `Map` with 5-minute TTL
- Falls back to hardcoded defaults for `fluxer.app` if discovery fails
- Accepts optional `instanceBaseUrl` for self-hosted support

---

### 5. `src/services/http.ts`

Wraps `CapacitorHttp` from `@capacitor/core`:
- Auto-injects `Authorization: <token>` header (bare token, no "Bearer")
- Handles 429 with `Retry-After` retry (up to 3 attempts, exponential backoff)
- `data` field (not `body`) for POST payloads — CapacitorHttp auto-serializes JS objects
- Check **both** `Retry-After` and `retry-after` header keys (Android OkHttp lowercases all headers)
- `CapacitorHttp` auto-parses JSON responses — guard with `typeof data === 'string' ? JSON.parse(data) : data`

---

### 6. `src/services/auth.ts`

```typescript
export async function login(email, password, instanceUrl?): Promise<LoginResponse>
  // POST /auth/login
  // On success: setStoredToken(response.token, response.user_id)
  // On mfa: return mfa response (caller stores ticket in React state only — NOT Preferences)
  // On pending_verification: throw FluxerHttpError with specific message

export async function loginWithMfa(ticket, code, method, instanceUrl?): Promise<void>
  // POST /auth/login/mfa/{method}  with { ticket, code }
  // On success: setStoredToken(...)

export async function validateSession(instanceUrl?): Promise<FluxerUser>
  // GET /users/@me — uses auto-injected token from http.ts

export async function logout(instanceUrl?): Promise<void>
  // POST /auth/logout in try block, clearStoredToken() in finally (always clears)
```

---

### 7. `src/contexts/AuthContext.tsx`

State machine via `useReducer`:

```
initializing
    │  validateSession succeeds/fails
    ▼
authenticated ← → unauthenticated → authenticating → authenticated
                                                    ↘ mfa_required → authenticating
                                                    ↘ ip_auth_required
                                                    ↘ error
```

Actions: `INIT_DONE`, `AUTHENTICATING`, `AUTHENTICATED`, `MFA_REQUIRED`, `IP_AUTH_REQUIRED`, `LOGOUT`, `ERROR`

MFA ticket lives in context state only — never persisted to Preferences (5-min TTL, meaningless after restart).

---

### 8. `src/hooks/useAuth.ts`

- On mount: `dispatch(AUTHENTICATING)` → `validateSession()` → `AUTHENTICATED` or `LOGOUT`
- After successful `isLoginSuccess`: call `validateSession()` to fetch full user profile (login response only returns `token + user_id`, not username/avatar)
- Exposes: `{ user, authState, login, submitMfa, logout, mfaAllowedMethods, error }`

---

### 9. `src/pages/Login.tsx`

- **Single page, state-driven UI** — no route change for MFA step (feels native)
- Conditional render: email/password form OR MFA code input based on `authState === 'mfa_required'`
- `IonSegment` for method selection (only shown when multiple MFA methods available, derived from `sms`/`totp`/`webauthn` booleans)
- `IonLoading` during `authenticating` state
- `IonToast` on `error` state
- Post-auth redirect: `router.push('/home', 'root', 'replace')` — prevents Back returning to Login

---

### 10. `src/App.tsx`

```tsx
<AuthProvider>
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/login" component={Login} />
        <ProtectedRoute exact path="/home" component={Home} />
        <Route exact path="/" render={() => <Redirect to="/home" />} />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
</AuthProvider>
```

`ProtectedRoute`: renders `null` during `initializing` (prevents flash redirect), redirects to `/login` when `unauthenticated`.

---

## Critical Gotchas

| Issue | Detail |
|---|---|
| `CapacitorHttp.enabled: true` | Without this, `fetch()` uses WebView and CORS blocks requests |
| `npx cap sync` | Must run after every `capacitor.config.ts` change |
| Auth header format | Use bare `Authorization: <token>` — no "Bearer" prefix for user sessions |
| Login response shape | `mfa: false/true` boolean discriminant, NOT `allowedMethods` array (Dart SDK docs differ from actual server) |
| POST body field | `CapacitorHttp` uses `data:` not `body:` — passing a JS object auto-serializes to JSON |
| Double-parse guard | CapacitorHttp auto-parses JSON; wrap with `typeof data === 'string'` guard |
| Android header casing | OkHttp lowercases all response headers — check both `Retry-After` and `retry-after` |
| MFA ticket | Store in React state only, never Preferences — 5-min server TTL makes it useless after restart |
| IP auth edge case | `pending_verification` flag on login response means "check email to authorize this IP" — surface a toast/modal |
| `validateSession` after login | `/auth/login` returns only `token + user_id` — always call `GET /users/@me` after to get full profile |
| iOS ATS | Self-hosted HTTP instances need `NSAllowsArbitraryLoads: true` in `Info.plist` |

---

---

## README.md

Content to generate at project root:

```markdown
# Flukavike

A native-feeling mobile client for [Fluxer](https://fluxer.app) — the open-source Discord alternative.
Built with Ionic Framework (React + TypeScript) and Capacitor.

## Design
- Discord/Fluxer PWA color system and layout
- Ivory by Tapbots — animation language, typography, tab bar, haptics

## Stack
- Ionic React + TypeScript
- Capacitor (Core, Preferences, Haptics)
- CapacitorHttp for native HTTP bridging (bypasses WebView CORS)
- Standard WebSocket for real-time gateway

## Getting Started
npm install
ionic serve                  # browser dev
npx cap run ios              # iOS device/simulator
npx cap run android          # Android device/emulator

## Self-Hosted Instances
On the login screen expand "Advanced" and enter your instance URL.
This mirrors the desktop client's settings.json `app_url` key.

## Architecture Notes
See PLAN.md for full implementation plan and API integration details.
```

---

## PLAN.md

At project root, write a copy of this entire plan document so it survives across Claude Code sessions and credit limits. Content = verbatim copy of this file.

---

---

## Splash Screen

**Package:** `@capacitor/splash-screen` (install alongside other Capacitor plugins)

```bash
npm install @capacitor/splash-screen @capacitor/haptics
```

### `capacitor.config.ts` — SplashScreen plugin block

```typescript
plugins: {
  CapacitorHttp: { enabled: true },
  SplashScreen: {
    launchShowDuration: 0,       // show immediately, hide manually
    launchAutoHide: false,       // we control hide() timing
    backgroundColor: '#1e1f22', // darkest Discord layer — matches app bg
    androidSplashResourceName: 'splash',
    androidScaleType: 'CENTER_CROP',
    showSpinner: false,
    splashFullScreen: true,
    splashImmersive: true,
  },
},
```

**Critical:** `launchAutoHide: false` means the splash stays visible until we call `SplashScreen.hide()`. This prevents the flash of the unauthenticated login screen on a cold start when the user has a valid stored session.

### When to hide

In `useAuth.ts`, inside the `initAuth` effect, hide the splash **after** `validateSession()` resolves (either success or failure):

```typescript
import { SplashScreen } from '@capacitor/splash-screen';

useEffect(() => {
  async function initAuth() {
    dispatch({ type: 'AUTHENTICATING' });
    try {
      const user = await validateSession();
      dispatch({ type: 'AUTHENTICATED', user });
    } catch {
      dispatch({ type: 'LOGOUT' });
    } finally {
      // Hide splash regardless of auth outcome — app is ready to render
      await SplashScreen.hide({ fadeOutDuration: 300 });
    }
  }
  initAuth();
}, []);
```

The 300ms `fadeOutDuration` gives a smooth dissolve into whichever screen is correct (Login or Home), matching Ivory's polished launch sequence.

### Splash screen asset

**File:** `resources/splash.png` — `2732×2732px` (Capacitor universal size)

Design spec:
- Background fill: `#1e1f22`
- Centered Fluxer logo SVG (white), `~400px` equivalent at 1x
- Soft radial glow behind logo: `radial-gradient(ellipse, rgba(88,101,242,0.35) 0%, transparent 60%)` at ~600px diameter
- No wordmark (logo only — clean like Ivory / Discord native apps)

Generate all platform-specific sizes automatically:

```bash
npx @capacitor/assets generate --ios --android
```

This reads `resources/splash.png` and outputs correctly-sized assets into `ios/` and `android/` directories.

### Android 12+ Splash Screen API

Android 12+ uses the native Splash Screen API. Add to `android/app/src/main/res/values/styles.xml`:

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
  <item name="windowSplashScreenBackground">#1e1f22</item>
  <item name="windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>
  <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
</style>
```

---

## Additional npm packages

```bash
npm install @capacitor/haptics @capacitor/splash-screen
npx @capacitor/assets generate --ios --android  # after placing resources/splash.png
```

---

## Verification

1. **Manual flow:** Run `ionic serve`, log in with valid Fluxer credentials — verify token stored in Preferences, user profile loaded, redirect to `/home`
2. **MFA flow:** Use a test account with TOTP enabled — verify MFA step slides in inline, code submission works
3. **Session persistence:** Close and reopen app — verify auto-login via stored token without re-entering credentials
4. **Rate limit:** Attempt multiple failed logins — verify `IonToast` displays rate limit message with retry timing
5. **Native device:** Run `npx cap run ios` / `npx cap run android` — verify no CORS errors appear in Xcode/Android Studio logs (confirms CapacitorHttp bridge is active)
6. **Design check:** Verify dark theme tokens applied, bottom tab bar pill animates between tabs, message grouping coalesceces consecutive messages correctly
7. **Haptics:** On iOS device — confirm haptic pulse fires on tab switch and send button
8. **Custom server:** Enter a self-hosted URL in the Advanced field, verify discovery hits the new origin, clear field and verify reset to default
9. **Splash screen (device only):** Cold-launch on iOS/Android — verify `#1e1f22` background + centered logo appears, then fades out (300ms) directly into the correct screen (Home if token valid, Login if not) with no white flash
