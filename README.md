# TATI ChildSave MVP

Financial capability learning for children, with parent, academy and administrator
workspaces. Originally built with [Lovable](https://lovable.dev); runtime hosting
uses Vercel, Firebase and remaining legacy Supabase integrations directly.

## Development

Use Node.js and npm. `package-lock.json` is the authoritative dependency lockfile;
do not restore the obsolete Bun lockfile. Copy [.env.example](./.env.example) to a
local environment file and configure your own service endpoints and credentials.
Never commit secrets or put Firebase Admin/Supabase service-role credentials in
`VITE_` variables.

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
npm run dev
```

## Verification and deployment

```sh
npm test -- tests/lovable-exit
npm run build
```

Database-backed tests require isolated Firebase Auth and Firestore emulators;
do not run the full suite with production credentials. Vercel uses the existing
`vercel.json` npm install/build configuration. No scheduled jobs or cron secret
are configured in this repository.

See [the dependency audit](./LOVABLE_DEPENDENCY_AUDIT.md) and
[completion report](./LOVABLE_EXIT_COMPLETION_REPORT.md) for the current inventory,
test evidence, environment settings, release gates and rollback instructions.
