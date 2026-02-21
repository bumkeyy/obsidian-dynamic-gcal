# Dynamic Google Calendar for Obsidian

`obsidian-dynamic-gcal` renders Google Calendar events in notes using a `gcal` code block and note frontmatter.

## Key goals

- Mobile compatible (`isDesktopOnly: false`)
- No Node.js runtime modules (`fs`, `crypto`, `http`, etc.)
- No `googleapis` dependency
- Web API only: `fetch` + `crypto.subtle`

## Setup

1. Create a Google OAuth client for an installed app.
2. Set redirect URI to `obsidian://gcal-auth`.
3. Open plugin settings and enter your OAuth Client ID.
4. Enter a session passphrase (used to encrypt/decrypt your refresh token).
5. Select **Login to Google**.

## Usage

Use this block in any note:

```gcal
date: frontmatter
calendar: personal, work
hide attendees
```

Supported directives:

- `date: frontmatter` or `date: YYYY-MM-DD`
- `calendar: idOrName1, idOrName2`
- `hide attendees`

If `calendar` is omitted:

- Plugin uses configured default calendars.
- If defaults are empty, plugin falls back to Google `primary` calendar.

If date cannot be resolved:

- Plugin falls back to today.

## Security model

- OAuth scope is fixed to `calendar.readonly`.
- PKCE is used for OAuth (`S256`).
- OAuth callback state is strictly validated.
- `access_token` is kept in memory only.
- `refresh_token` is encrypted with Web Crypto (`PBKDF2 + AES-GCM`) before `saveData`.
- Passphrase is session-only and not persisted by the plugin.
- Logout revokes tokens (when available) and clears local token state.

## Development

```bash
npm install
npm run test
npm run build
```

## Testing coverage

- Core parsing/date fallback utilities
- PKCE and encrypted token vault
- OAuth exchange/refresh/revoke flow
- Calendar API matching/normalization/sorting
- React mount/unmount lifecycle
- Integration flow for OAuth callback and codeblock render pipeline

## Release artifacts

For Obsidian release package, include:

- `main.js`
- `manifest.json`
- `styles.css` (optional; this project currently does not use one)
