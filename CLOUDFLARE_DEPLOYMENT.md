# Deploy EcoMath Mission independently on Cloudflare

This project supports two isolated authentication modes:

- **Sites mode** (default): Sign in with ChatGPT, used by the current hosted site.
- **Standalone mode**: Google OAuth through Auth.js, enabled only when
  `AUTH_MODE=standalone` in `wrangler.standalone.jsonc`.

No Google secret, teacher password, session secret, or OpenAI API key belongs in
the browser bundle or Git repository.

## 1. Requirements

- A free Cloudflare account
- Node.js 22.13 or newer
- A Google Cloud OAuth 2.0 Web Application credential
- Wrangler authenticated on your own computer (`npx wrangler login`)

## 2. Create and configure D1

```bash
npx wrangler d1 create ecomath-mission-db
```

Copy the returned database ID into `wrangler.standalone.jsonc`, replacing the
placeholder value. Then apply the existing schema:

```bash
npx wrangler d1 migrations apply ecomath-mission-db --remote --config wrangler.standalone.jsonc
```

The D1 database stores profiles, class membership, generated class codes,
mission attempts, Polya scores, feedback, and ECD evidence. Auth.js uses an
encrypted JWT session cookie, so Google tokens are not stored in D1.

## 3. Configure Google OAuth

Create an OAuth 2.0 Client ID of type **Web application**. Add this production
redirect URI exactly:

```text
https://YOUR-WORKER-DOMAIN/api/auth/callback/google
```

For local testing, also add:

```text
http://localhost:3000/api/auth/callback/google
```

The first deploy may use a `workers.dev` domain. If you later attach a custom
domain, add the new callback URI in Google Cloud before switching domains.

## 4. Add server-only secrets

Run each command locally. Wrangler prompts securely; do not paste the values
into source files.

```bash
npx wrangler secret put AUTH_GOOGLE_ID --config wrangler.standalone.jsonc
npx wrangler secret put AUTH_GOOGLE_SECRET --config wrangler.standalone.jsonc
npx wrangler secret put AUTH_SECRET --config wrangler.standalone.jsonc
npx wrangler secret put ECOMATH_TEACHER_PASSWORD_HASH --config wrangler.standalone.jsonc
npx wrangler secret put ECOMATH_SESSION_SECRET --config wrangler.standalone.jsonc
```

Generate the two random secrets locally:

```bash
openssl rand -base64 48
```

Choose the teacher password yourself, then calculate its SHA-256 hash locally:

```bash
node -e "const c=require('node:crypto');process.stdin.once('data',d=>console.log(c.createHash('sha256').update(d.toString().trim()).digest('hex')))"
```

The public teacher username defaults to `guru-ecomath`. The password itself is
never stored; only its hash is configured as a Worker secret.

## 5. Build and deploy

```bash
npm ci
npm run build
npx wrangler deploy --config wrangler.standalone.jsonc
```

After deployment, verify these flows:

1. Student signs in with Google, enters a class code, completes a mission, and
   sees a personal report.
2. Teacher signs in with Google, then enters the one teacher username/password.
3. Teacher creates a class, copies the generated code, and sees the student's
   Polya scores and Evidence Log.
4. Both roles can use **Keluar akun** in the top account menu.

## Optional AI case endpoint

Gameplay does not require AI. The browser service calls only the developer-owned
`/api/generate-case` endpoint and automatically falls back to the validated local
generator on timeout, invalid JSON, or an unavailable endpoint. If you add that
server route later, keep the OpenAI API key in a Cloudflare Worker secret and
return the documented structured case contract. Never expose a standard API key
to client JavaScript.
