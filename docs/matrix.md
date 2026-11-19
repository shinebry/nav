# Personal messaging without Beeper

The app now talks directly to your own Matrix homeserver. Standalone mautrix bridges translate between Matrix rooms and platform conversations. No Beeper app, account, or Desktop API is used.

## Start on your own computer

Requirements: Node.js 22+, Docker with Compose running Linux containers, and an x64 or arm64 computer. The app connects to local services; Docker Desktop works on Windows/macOS and Docker Engine on Linux.

```sh
npm ci
npm run setup:matrix
npm run personal
```

Open http://127.0.0.1:3000. In Settings → Messaging:

1. Check connection. This initializes the encrypted Matrix client.
2. Open Platforms → WhatsApp → Link. The app creates a private encrypted management room with `@whatsappbot:nav.local` and sends `!wa login` to that local bridge bot.
3. Refresh the chat to see the bridge's prompt and QR code. On your phone, open WhatsApp → Linked devices → Link a device and scan the QR code. Do not share QR codes or login credentials.
4. Choose chats lists joined and invited rooms. Add a room to Sources; choosing an invitation explicitly joins it.
5. Open a source to read its messages. Refresh and earlier-message loading are explicit. Text sends only when you press Send/Enter; Shift+Enter adds a newline.

The QR expires according to the upstream bridge. Click Link again to request a fresh login prompt. The bridge may require following its bot instructions before emitting a QR.

The same npm commands work in Windows PowerShell, macOS Terminal, and Linux shells. The web app runs in your desktop browser. Bridge executables run inside Linux containers on all three systems. Apple Messages alone needs a separate Mac relay; your app can remain on Windows or Linux. Native Windows/macOS end-to-end installation has not been tested here.

## What setup creates

- A private, single-process Synapse homeserver named `nav.local`, exposed only at `127.0.0.1:8008`. Federation and open registration are disabled.
- A standalone mautrix-whatsapp bridge with permissions restricted to `@personal:nav.local`; unrecognized users are blocked.
- A local Matrix account/device and token in `.env`, never sent to the browser. The generated account password is retained privately in `.local/account-recovery.json`.
- Encrypted bridge portals (`allow`, `default`, and `require` are enabled). Matrix-to-bridge encryption does not make the local bridge unable to see your plaintext: the bridge is the endpoint translating to WhatsApp.
- Persistent Synapse, bridge, and Rust crypto data under `.local/`, ignored by Git and blocked by the static server.

The bridge executable is the official `mautrix/whatsapp` v0.2611.0 release, verified against the pinned SHA-256 list in `infra/mautrix-whatsapp.sha256`. It runs in the same pinned base image as Synapse for a reproducible CA/runtime environment. It is the standalone upstream binary, not Beeper's application.

The homeserver uses SQLite for this personal starter. Multiuser or high-volume operation should move to PostgreSQL before broad deployment. There is no public signup, federation, tunnel, or public bridge endpoint here.

## Stop and resume

```sh
npm run services:stop
# Later:
npm run services:start
npm run personal
```

Setup is repeatable and preserves existing registration tokens, account/device credentials, and databases. Back up `.local/` and `.env` together; they contain private account credentials and encryption keys. Do not commit or share them. Deleting the crypto store while reusing the same Matrix device token is rejected; restore the store or sign in as a new Matrix device rather than regenerating its keys.

If Docker uses a nondefault local socket, set `NAV_DOCKER_SOCKET` to that Unix socket before running setup. On managed Linux environments the installer uses `/var/run/docker.sock`. The bridge and Synapse communicate directly only on their private Docker network; outbound requests continue to use the configured proxy. Node downloads honor normal Node proxy configuration; managed networks may require `NODE_USE_ENV_PROXY=1` and the environment's trusted CA bundle. TLS and artifact checksum verification must stay enabled.

## Current scope

Implemented: local setup, encrypted Matrix sessions, room list/invitations, explicit join, bridge login control room, text send/read, encrypted attachment download and image/QR display. Message history stays in browser memory. Sending returns homeserver acceptance, not a claim of delivery on the external network. Failures never trigger an automatic send retry.

Native Matrix chats and additional packaged bridges and manual connectors are listed in [platform setup](platforms.md). Install only the services you want, then link each account explicitly in Settings → Messaging → Platforms. No external account is automatically logged in.

The app's local mock call UI, editable histories, reactions, typing events, and file composer are separate features; they are not yet mapped onto Matrix/platform equivalents. Outbound attachments are not yet wired to bridges. Incoming media uses the homeserver's authenticated repository; no arbitrary local file paths are exposed.

## Validation and remaining account step

Tested against real local services: Synapse account login, Rust crypto initialization, encrypted room send, ciphertext on the homeserver, decryption by a second client, and bridge management room communication. Unit tests cover the private request boundary, event mapping, and unavailable-key handling. The browser flow also passed against the real local homeserver: connection check, room import, history, encrypted bridge-bot command, and mobile layout. Run `npm run verify:matrix` for the opt-in live verification; it creates a local test account/room and sends only to that fixture and your local bridge bot, never to platform contacts. No user's external platform account was available, so phone linking and delivery to a real WhatsApp contact remain unverified. Tests do not send to real contacts.

## Upstream references

- https://github.com/element-hq/synapse
- https://github.com/mautrix/whatsapp
- https://docs.mau.fi/bridges/go/whatsapp/authentication.html
- https://docs.mau.fi/bridges/general/docker-setup.html
- https://github.com/turt2live/matrix-bot-sdk

The application depends on matrix-bot-sdk and its Rust crypto binding; it does not depend on Beeper. Upstream licenses remain applicable.
