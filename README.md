<div align="center">

<img src="./assets/hero.svg" alt="JerSuit Discord Management Platform" width="100%">

<br>







A modern, secure, self-contained Discord management platform for serious server administration.

</div>

✦ About JerSuit

JerSuit is a Discord management platform focused on reliability, security, customization, and a premium administration experience.

V2 is a major rebuild designed to eliminate the failure patterns encountered in V1: fragile external RPC/database dependencies, OAuth callback failures, database signature mismatches, uncontrolled API errors, unclear configuration, development-server instability, and cascading failures.

Status: V2 rebuild in progress. Features are considered work-in-progress until verified by integration tests.

✨ Features

🎛️ Control Center

Premium responsive dashboard

System and bot status

Guild management foundation

Activity and audit events

Command Palette with Ctrl/⌘ + K

Proper loading, empty, unavailable, and error states

🎨 Full Customization

Light mode

Dark mode

System mode

CSS-variable design system

Customizable dashboard appearance

Responsive layouts

JerSuit green visual identity

🔐 Security First

Discord OAuth

Secure HTTP-only sessions

Session expiration and revocation

Server-side authorization

Input validation

Rate limiting

Audit/security events

Safe error responses

🗄️ Self-Contained Database

V2 removes the Supabase dependency and moves persistence into the application architecture using PGlite, an embedded PostgreSQL implementation.

The database layer is intended to persist:

users

sessions

guilds

settings

security events

audit logs

Persistence must survive application restarts. In-memory storage is not an acceptable production substitute.

🧩 Discord Integration

Discord OAuth

User profiles

Guild synchronization

Permission-aware guild management

Bot integration foundation

🖼️ Architecture

<img src="./assets/architecture.svg" alt="JerSuit V2 architecture diagram" width="100%">

Browser
   │
   ▼
Next.js Dashboard
   │
   ├── Authentication
   ├── API Routes
   ├── Validation
   ├── Security
   └── Services
          │
          ▼
   Internal PostgreSQL
      (PGlite)

🏗️ Architecture Principles

Single source of truth

Schema, migrations, services, and validation are controlled by the repository.

No fragile RPC coupling

Database access goes through typed service functions rather than a large collection of manually synchronized external RPC functions.

Controlled failure

Every expected failure follows:

Detect → Validate → Log safely → Handle → Return controlled response

No cascading failures

A failure in one subsystem must not unnecessarily take down unrelated parts of the application.

Real data only

The dashboard must never fabricate operational statistics. If data is unavailable, show an explicit loading, unavailable, not-configured, error, or empty state.

🔒 Security

Security is an architectural requirement, not a final polish step.

Authentication flow

Discord OAuth
      ↓
Validate callback
      ↓
Validate Discord identity
      ↓
Create / update local user
      ↓
Create local session
      ↓
Secure HTTP-only cookie
      ↓
Dashboard

Never expose to users:

OAuth tokens

session tokens

database URLs

API secrets

SQL queries

stack traces

environment variables

🧪 Reliability & Testing

V2 is explicitly designed around known V1 failure cases.

Database

Initialize database

Create/update user

Create/validate/revoke session

Persist guilds

Persist settings

Persist audit events

Verify persistence after restart

Authentication

Login

OAuth callback

New user

Existing user

Invalid OAuth response

Expired/revoked session

Logout

Unauthorized/forbidden requests

API

Valid request

Invalid request

Malformed JSON

Database failure

Discord API failure

Rate-limited request

UI

Landing page

Dashboard

Loading/error/empty states

Light mode

Dark mode

System mode

Responsive layout

Command Palette

Customization

🚀 Getting Started

Requirements

Node.js 18+

npm

Discord application credentials

Install

git clone <your-repository-url>
cd <repository-directory>
npm install

Environment

cp .env.example .env.local

Configure Discord OAuth and application settings.

Never commit .env.local or real credentials.

Development

npm run dev

Open:

http://localhost:3000

Production build

npm run build

A successful build is necessary but not sufficient for release readiness. Authentication, persistence, security, and failure paths must also be tested.

⚙️ Environment

The complete list belongs in .env.example.

Example categories:

APP_URL=

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=

The internal PGlite database is managed by the application.

📁 Project Structure

.
├── app/
│   ├── api/
│   │   └── auth/
│   ├── dashboard/
│   └── ...
├── components/
├── lib/
│   ├── db.ts
│   ├── config.ts
│   ├── auth.ts
│   ├── audit.ts
│   ├── errors.ts
│   ├── logger.ts
│   └── services.ts
├── assets/
├── public/
├── .env.example
├── package.json
└── README.md

The structure may evolve during the V2 rebuild.

🛡️ V1 → V2

Area

V1

V2 Direction

Database

Supabase

Internal PostgreSQL / PGlite

DB access

External RPC

Typed service layer

Authentication

OAuth + external DB

OAuth + local persistence

Sessions

RPC dependent

Local session service

Errors

Fragile in places

Centralized typed errors

Configuration

Environment dependent

Validated configuration

Security

Distributed

Centralized model

Theme

Limited

Light / Dark / System

Customization

Limited

Full customization foundation

Dashboard

Basic

Premium control center

Reliability

Recurring issues

Defensive architecture + tests

🗺️ Roadmap

Phase 1 — Foundation

Remove Supabase

PGlite database

Schema + migrations

Service layer

Typed errors

Configuration validation

Structured logging

Phase 2 — Authentication

Discord OAuth

User persistence

Secure sessions

Session revocation

Logout

Security events

Phase 3 — Dashboard

Premium dashboard shell

Real system status

Guild management

Activity feed

Command Palette

Security Center

Settings

Phase 4 — Customization

Light mode

Dark mode

System mode

Theme customization

Layout customization

Branding options

Responsive improvements

Phase 5 — Reliability

Integration tests

Authentication tests

Persistence tests

API error tests

Security tests

Regression testing

Production build validation

Phase 6 — Release

Documentation

Security audit

Performance review

Production configuration

Release candidate

Stable V2 release

🧭 Development Philosophy

Secure by design.
Fail gracefully.
Persist reliably.
Never fake system data.
Do not ship known errors.

If a feature cannot be implemented safely yet, it should be clearly marked as unavailable rather than pretending to work.

🤝 Contributing

Before submitting a pull request:

npm run build

Also verify that your change does not introduce broken imports, unhandled errors, secret exposure, authentication regressions, persistence regressions, fake data, inaccessible UI, or broken themes.

🔐 Responsible Security Reporting

Do not publish sensitive exploit details in a public issue. Use the repository's private security reporting process when available.

Recommended repository security controls:

Dependabot alerts

Secret scanning

Push protection

Code scanning

SECURITY.md

📄 License

See the repository's LICENSE file for the current licensing terms.

<div align="center">

Built for better Discord server management.

JerSuit V2

<sub>Secure · Self-hosted · Reliable · Customizable</sub>

</div>
