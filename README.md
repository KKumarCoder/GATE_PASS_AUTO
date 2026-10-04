# SRPS Smart Gate Pass Management System

A full-stack gate operations application for Shree Ram Public School, Kanhra-Badhra (Charkhi-Dadri), Haryana 127312, affiliated to CBSE, New Delhi.

React/Vite/Tailwind frontend; Express/Mongoose API; MongoDB replica-set transactions; role-based staff sessions; parent OTP and secure-link approval; QR/manual guard verification; visitor and staff movement; CSV/Excel/PDF reports.

Each student can have only one gate pass per requested exit date, using the school's India-local calendar date. This limit still applies after the pass has been used.

Administrators can permanently delete student records from the directory. A confirmation is required; existing gate passes and audit history are retained, and deletion is blocked while the student has an active gate pass.

Gate-pass lists support filtering by requested-exit date, status, and pass number, with page sizes starting at five records. Administrators can cancel or reject pending passes with a recorded reason, or permanently delete a pass; deletion removes its OTP and notifications while retaining audit and gate-event history.

Admins can set a new password directly from **Users & access** without issuing a recovery link. Passwords must be at least 12 characters; changing a staff password revokes their active sessions and invalidates outstanding recovery links.

## 58mm Gate Pass printing

After a Gate Pass request is created, the success dialog offers **PRINT GATE PASS**, **VIEW PASS**, and **CLOSE**. A request receives its secure QR only after parent verification and administrator approval; the 58mm print page keeps printing unavailable until the same approved pass QR is loaded. Reprint from the pass list or details page uses that existing pass and QR without creating another record.

The print view uses browser-native HTML/CSS printing at 58mm width. Click **PRINT GATE PASS** to open the normal browser print dialog and select the locally installed Billing Buddy 58mm printer. First pair/install the printer in the school computer's Windows/macOS system settings. The CRM does not pair with Bluetooth or send printer commands; Hostinger/VPS serves the page while the local browser communicates with the installed printer through the system print dialog.

## Run locally

From the workspace root:

```bash
cd srps-gate-pass
npm ci
cp .env.example .env
```

Edit `.env`. Minimum configuration:

```dotenv
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://YOUR_DATABASE_CONNECTION
JWT_ACCESS_SECRET=YOUR_INDEPENDENT_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
JWT_REFRESH_SECRET=ANOTHER_INDEPENDENT_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
FRONTEND_URL=http://localhost:5173
OTP_EXPIRY_MINUTES=5
WHATSAPP_PROVIDER=none
SEED_ADMIN_EMAIL=YOUR_ADMIN_EMAIL
SEED_ADMIN_PASSWORD=YOUR_STRONG_PASSWORD_AT_LEAST_12_CHARACTERS
SEED_ADMIN_NAME=YOUR_ADMIN_NAME
```

Generate each JWT secret separately with `openssl rand -hex 48`. Keep values in `.env` only. `MONGODB_URI` must reference Atlas or a MongoDB replica set, because gate movements and their audit records commit together. Standalone MongoDB is not supported.

```bash
npm run migrate -w server
npm run seed
npm run dev
```

Open **http://localhost:5173**. Sign in with your configured administrator email or employee ID `SRPS-ADMIN-001`. The seed creates only the administrator and school settings; it does not populate fictional school records. Remove the seed password from `.env` after initial provisioning.

```bash
npm test
npm run build
npm run test:browser
```

For the full backend, build and three browser suites, run `npm run check`. Individual additional browser suites are `npm run test:browser:access` and `npm run test:browser:operations`. See [QA review](docs/QA-REVIEW.md) for coverage and external checks.

Tests launch an isolated temporary MongoDB replica set; the first run downloads MongoDB. They never use the configured school database or real messaging credentials.

## Local development OTP mode

While the WhatsApp adapter is being finalized, set these values in the **project-root** `srps-gate-pass/.env` (the server does not load `server/.env`):

```dotenv
NODE_ENV=development
OTP_DELIVERY_MODE=console
```

Restart `npm run dev`. On a pass awaiting parent verification, click **Generate development OTP**. The backend terminal prints one line like:

```text
[SRPS DEV OTP] Pass: SRPS-GP-2026-000001 | OTP: 123456 | Expires: ... | LOCAL TEST ONLY
```

The digits above are an example; enter the freshly logged six-digit code in **6-digit parent OTP**, then click **Verify OTP**. Administrator approval and QR/exit testing work normally afterward. Expiry, resend cooldown and verification-attempt limits still apply. Use a new request if the old pass has expired.

Only the backend terminal receives the plaintext code. API responses never include it, and the database still stores a bcrypt hash. Notifications label these attempts **Development Only**; verification is recorded as `DEVELOPMENT_OTP`, not real parent contact. Other WhatsApp notification settings are unaffected.

For real SMS OTP delivery, set `SMS_PROVIDER=twilio`, `OTP_DELIVERY_MODE=sms`, and provide the Twilio Account SID, Auth Token, and existing Verify Service SID in the project-root `.env`. Use `Shree Ram Public School` as the Verify Service Friendly Name. `(SAMPLE TEST)` is a Twilio Trial marker and is not removed by renaming the Service. Twilio Verify uses its Service/default or approved `HJ...` template, not arbitrary application text. Console mode fails startup outside `NODE_ENV=development`; console-issued codes and development-verified passes cannot be used to authorize production departures. Existing WhatsApp notifications remain separately configurable.

For both parent-verification choices, configure Twilio for SMS and SMTP for email in the same project-root `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. The gate-pass screen lets staff choose either SMS OTP (sent to the registered parent mobile) or Email OTP (sent to the student's registered email). Add the student's email when creating a record; CSV/Excel student imports must also include an `email` column. Existing student records should be updated with an email before using email verification. SMTP credentials are required only for email delivery; the settings response indicates which channels are configured without exposing credentials.

## Bus staff and driver exit emails

In **School settings → Bus staff directory**, administrators can add, edit, and remove bus staff records with a staff ID, name, bus number, mobile, email, and photo. No driver workbook upload is needed. Staff creating a gate pass can select a registered bus number. Once security records a successful QR/manual-verification exit, the matching driver receives the student's name, class, village, pass reason, exit time, and gate by email. Failed or unconfigured delivery is visible at the guard station and can be retried; the student's exit remains recorded. Configure the SMTP settings above to send these notices. Student records need a village name for the notification.

## USB QR scanner kiosk

The security station supports the POSLOW T-6900 when it is configured as a USB HID keyboard scanner and sends Enter after each barcode. Sign in as a user with `gate.move`, open **Gate scanner** (or `/gate/scanner`), and keep that page open. The scanner page reads the QR URL without navigating away, extracts the token from `/gate/verify/<token>`, and posts it to the authenticated `POST /api/gatepasses/scan` endpoint. The public `GET /api/gatepasses/verify/:token` remains a read-only verification endpoint; only an authorized POST scan can record an exit.

The scan endpoint atomically transitions an approved, valid pass to `EXITED` or `NO_RETURN_REQUIRED`, records the India-local exit timestamp and gate, and writes gate/audit events. Reused, cancelled, rejected, expired, too-early, invalid and unapproved passes are denied. The scanner uses the configured school gates and enforces a user's assigned gate. No device driver is needed for HID keyboard mode; ensure the scanner's suffix is set to Enter. The scan screen needs a signed-in staff session and network access to the CRM API.

`FRONTEND_URL` remains the source of the QR's public base URL. Set it to the deployed HTTPS school URL (for example `https://school.example.com`) before building/deploying; the QR token remains a secure token and contains no student details. The existing same-origin Nginx `/api/` proxy is used, so no separate frontend API URL or permissive CORS setting is required. `VITE_SCANNER_RESET_MS` optionally controls how long scan results remain visible (1500–10000 ms; default 3000); it is a frontend build-time setting and contains no secret. The release Nginx config gives `/gate/scanner` the same no-store handling as other sensitive app routes.

To test locally, start the CRM, sign in as a security guard, open **Gate scanner**, and scan an approved pass or paste a QR URL into the development-only test field. Confirm a successful scan records exit time/gate and a second scan is denied. The T-6900 itself must be plugged into the gate computer to validate its actual HID mode and Enter suffix; automated tests simulate the same token POST and duplicate-scan races.

## Documentation

- [Phase-by-phase implementation, packages and API examples](docs/PHASES.md)
- [Hostinger VPS deployment and rollback](docs/DEPLOYMENT.md)
- [Security model and operating boundaries](docs/OPERATIONS.md)
- [CSV import header](docs/examples/students.csv)
- [Integration tests](server/tests/workflow.test.js)

Complete source code is in `client/src/` and `server/`. All API responses use `{ success, message, data }`, except binary PDF/Excel/CSV/image downloads.

## Before live school use

Configure the real school database, domain, WhatsApp provider, staff accounts, gates and student register. Test the actual provider contract and approved Meta templates, camera permissions on the school's guard devices, print output, backup restoration and staff procedures in staging. This workspace includes deployable code and deployment files; it has not been deployed to a VPS or connected to a live school messaging account.

Browser checks use an isolated database and headless Chrome (installed Google Chrome on macOS; run `npx playwright install chromium` on Linux). Screenshots are saved locally under `artifacts/` and excluded from Git.
