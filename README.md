# CUS Shift

Mobile (Expo / React Native) version of the `cus-reporting` web app: geofenced
employee check-in and check-out. The admin dashboard lives only on the
`cus-reporting` website. The app is a client — it talks to the
web app's API, which owns the MongoDB database and all the rules (geofence,
late cutoff, duplicate check-ins).

## Setup

```bash
npm install
cp .env.example .env.local   # then edit EXPO_PUBLIC_API_URL
npx expo start
```

`EXPO_PUBLIC_API_URL` is the address of the running web app. A phone can't
reach `localhost` — use your computer's LAN address (`http://192.168.x.x:3000`),
`http://10.0.2.2:3000` on the Android emulator, or the deployed `https://` URL.
Restart the app after changing it.

## Screens

| Route | What it does | Web equivalent |
| --- | --- | --- |
| `/login` | Employee sign-in, or first-time "Set your password". Shown on launch when nobody is signed in | — |
| `/` | Home for a signed-in employee: today's check-in / check-out, and the button for the next step | — |
| `/checkin/in`, `/checkin/out` | GPS fix → server geofence check → result | — |

Not ported: the `/qr` page (employees now open the app instead of scanning a code).

## Shifts, breaks and the alarm

The home screen shows the employee's shift and today's fixed break times (set by the admin on the website;
nobody starts or ends a break in the app). While checked in on a shift the app runs a background location
task (Android foreground service, persistent "on shift" notification) that stops at check-out or shift end:

- outside the office outside a break -> a notification (repeats every 5 min) and the admin's "Outside right now" panel;
- still outside when a break ends -> the **break-over alarm** (sound + vibration, on the alarm audio stream) rings
  every 2 minutes (admin-configurable); it can be **silenced only after the 5th ring** and stops by itself once back inside.

The employee must allow location "all the time" and notifications (the home screen asks). The alarm is
driven by location ticks (~30 s), so it can be up to a minute late. Android may stop apps on some phones:
use the "Keep reliable" link to exempt the app from battery optimisation. None of this works in Expo Go:
use a development build or the CI APK. Logic: `src/lib/presence-task.ts`, `src/lib/presence-logic.ts`
(mirrors the server's `classifyPresence`), `src/app/alarm.tsx`.

## Employee accounts

Each employee has their own account, so nobody can check in or out for someone else.

1. **Admin** adds the employee's **name and email** (Employees tab). The account starts as *Invited*. Nothing is handed to the employee.
2. **Employee** opens the app → *First time? Set your password*, enters their email and gets a
   6-digit code by email. They enter the code and choose a password; the account becomes *Active*
   and they're signed in. Having the code is what proves the email is theirs.
3. After that they sign in with email + password (session lasts 30 days on the device). If they
   forget it, *Forgot your password?* does the same email-code steps and signs out every other device.
4. **Check in** and **Check out** each read the phone's location once; the server rejects
   either one unless the employee is inside the office radius. Who is acting always comes from
   the session — the app never sends an employee id.

An employee added before accounts existed shows *No email* until the admin edits one in. Changing an
employee's email signs them out and clears their password: they verify the new address with a fresh code.

## Backend contract

The app calls these `cus-reporting` endpoints (`src/lib/api.ts`):

- Employee: `POST /api/auth/login`, `POST /api/auth/request-code`, `POST /api/auth/activate`, `POST /api/auth/logout`,
  `GET /api/auth/me`, `POST /api/check-in`, `POST /api/check-out`

The session is the web app's httpOnly `employee_session` cookie, kept in the
OS cookie jar.

## Checks

```bash
npx tsc --noEmit
npx eslint .
```

## iPhone / web app (PWA)

iPhones can't install an APK, so the same code also builds as an installable web app. Free, no Apple account, no expiry, and every deploy updates everyone instantly.

**Deploy (Vercel, free):** import this folder as a project. `vercel.json` already sets the build (`expo export --platform web`) and forwards `/api/*` to the backend (`https://cus-reporting.vercel.app`; change it there if the backend moves). Optional env var on the Vercel project: `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (see below).

**Install on iPhone:** open the Vercel link in **Safari**, Share, **Add to Home Screen**, then open CUS Shift from the new icon. iOS 16.4 or newer.

**Try it locally:** `npm run build:web`, then `BACKEND_URL=http://localhost:3000 npm run serve:web` and open http://localhost:8080.

**Admin alerts to iPhones:** run `npx web-push generate-vapid-keys` once. On the cus-reporting deployment set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; on the web app's Vercel project set `EXPO_PUBLIC_VAPID_PUBLIC_KEY` to the same public key.

**Differences from the Android app**
- Location is only read while the app is open and the screen is on (a screen wake lock is held while on shift). iOS does not let any web app track in the background, so break alarms and "outside" warnings don't fire with the app closed or the phone locked. The admin sees the employee as "no signal" in that case.
- Alarm sound plays only while the app is open (and after the person has tapped something once). A locked-phone alarm notification uses the iPhone's normal notification sound and vibration, not the custom loud alarm sound.
- No "Allow all the time" location step or battery settings (not applicable). The APK "update available" card is hidden: the web app always runs the latest version.
