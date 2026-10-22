# CUS Shift

Mobile (Expo / React Native) version of the `cus-reporting` web app: geofenced
employee check-in plus an admin dashboard. The app is a client — it talks to the
web app's API, which owns the MongoDB database and all the rules (geofence,
late cutoff, duplicate check-ins, admin auth).

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
| `/` | Home, entry to check-in and admin | `/` |
| `/login` | Employee sign-in, or first-time "Set your password". Shown on launch when nobody is signed in; has a small Admin link | — |
| `/` | Home for a signed-in employee: today's check-in / check-out, and the button for the next step | — |
| `/checkin/in`, `/checkin/out` | GPS fix → server geofence check → result | — |
| `/admin/login` | Admin sign-in | `/admin/login` |
| `/admin` | Day's attendance, stats, date picker, map links | `/admin` |
| `/admin/employees` | Add (name + email) / edit / delete employees | `/admin/employees` |

Not ported: the `/qr` page (employees now open the app instead of scanning a code).

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
- Admin: `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/attendance?date=`,
  `GET|POST /api/employees`, `PATCH|DELETE /api/employees/:id`

Sessions are the web app's httpOnly cookies (`employee_session`, `admin_session`), kept in the
OS cookie jar.

## Checks

```bash
npx tsc --noEmit
npx eslint .
```
