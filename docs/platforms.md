# Messaging platforms

Use the app on Windows, Linux, or macOS. Install Node.js 22+ and Docker with Compose (Linux containers). On Windows and macOS, Docker Desktop supplies the Linux runtime. No Beeper Desktop or Beeper account is required.

Run these commands from the repository in PowerShell or your terminal:

```sh
npm ci
npm run setup:matrix
npm run setup:bridges -- slack,steam
npm run personal
```

To prepare every packaged bridge, replace the third command with `npm run setup:bridges -- --all`. Services retain their data between restarts. Use `npm run services:stop`, `npm run services:start`, and `npm run services:status` to manage the entire installation, including extra bridges.

Open http://127.0.0.1:3000 → Settings → Messaging → Platforms. Link accounts individually. Choose chats adds conversations to Sources. Installation does not sign into a platform account.

| Platform | Setup |
| --- | --- |
| Matrix | Native; Platforms → Matrix → Chats or New chat |
| Slack | `setup:bridges -- slack`; workspace login |
| Steam | `setup:bridges -- steam`; experimental, Steam mobile QR login |
| Microsoft Teams | `setup:bridges -- teams`; community connector, work/school or personal login flow |
| Email | Direct IMAP/SMTP; Platforms → Email → Connect |
| WhatsApp | Included by `setup:matrix`; phone pairing |
| Discord | `setup:bridges -- discord` |
| Instagram | `setup:bridges -- instagram` |
| Facebook Messenger | `setup:bridges -- messenger` |
| Bluesky | `setup:bridges -- bluesky` |
| X | `setup:bridges -- x` |
| Telegram | `setup:bridges -- telegram`; Configure API ID/hash locally in Platforms, then rerun this command |
| Signal | `setup:bridges -- signal`; phone pairing |
| Google Messages | `setup:bridges -- googlemessages`; phone pairing |
| Google Voice | `setup:bridges -- googlevoice` |
| LinkedIn | `setup:bridges -- linkedin` |
| TikTok | `setup:bridges -- tiktok`; experimental community connector |
| Apple Messages | [Separate Mac relay](https://docs.mau.fi/bridges/go/imessage/mac/setup.html) |
| Google Chat | [Separate Python bridge](https://docs.mau.fi/bridges/python/googlechat/index.html) |
| LINE | [Standalone source build](https://github.com/beeper/line#self-hosted-matrix-server-docker) |
| Reddit | [Community bridge](https://github.com/ricardo-duarte-av/matrix-redditchat-bridge); not installed or verified |
| Threads | No maintained standalone messaging bridge verified |

Matrix's New chat accepts `@user:server`, `#room:server`, or `!room:server`. Direct chats are encrypted and reused when already open. Opening a direct chat invites that user; it does not send a text message. Room joining is explicit. The default private `nav.local` server has federation disabled, so it can reach local Matrix users and bridge conversations only. To talk to users on public Matrix servers, configure an existing HTTPS homeserver and a new dedicated device access token in your private `.env` using `.env.example`; keep its crypto store. Existing account login and multi-account switching are not implemented in the UI. Bridges must be registered on whichever homeserver the app uses.

For separate bridges, follow upstream registration and installation instructions, then save the bridge bot ID and command prefix in Platforms. Saving a bot ID does not install a service. A remote Mac relay requires a secure private or HTTPS route to the same homeserver; the default localhost-only server is not remotely reachable. Do not expose it publicly to solve this.

Pinned releases, artifact checksums, and upstream repositories are recorded in [bridges.json](../bridges.json) and `infra/`. Instagram and Messenger use the current `mautrix/meta` project. LINE's open source bridge can be self-hosted independently of Beeper.

Verified on 2026-11-17: native Matrix room-alias joining, duplicate direct-chat reuse, encrypted outgoing events on Synapse, second-client decryption, and incoming decrypted history. Slack and Steam standalone services both joined encrypted control rooms and replied to help. Desktop and mobile UI checks passed, including native Matrix chat opening and Steam history. Run `npm run verify:messaging` with the personal app running to repeat this local-only integration test. It creates a local fixture account and sends only to that fixture and the Slack/Steam/Teams control bots; it does not log into either platform.

Slack uses the official `mautrix/slack` v0.2611.0 binaries with tracked upstream SHA-256 checksums. Steam uses [jasonlaguidice/matrix-steam-bridge](https://github.com/jasonlaguidice/matrix-steam-bridge) at source revision `a3938326350dbe488724f979033d71a01e4ab1a3`, with image digest pinned in `bridges.json`. Its Go bridge starts the included SteamKit service using `/app` as the executable directory. Login defaults to QR; help exposes other login options. Steam remains a community connector with real account login and external delivery unverified. No Beeper software is required.

Linux services, encrypted control-room replies for the official packaged bridges except Telegram, and local Matrix messaging were tested. Telegram waits for your API credentials. Windows/macOS installation, external account login, and delivery to real platform contacts remain unverified. TikTok is experimental; its local control room starts, but platform login remains unverified. Features and attachment restrictions of each external platform still apply.

Credentials and encryption data remain under `.local/` and `.env`; neither is served to the browser or committed. Enter account credentials only into your local setup and the appropriate bridge login flow, never into this chat.


## Microsoft Teams

The standalone community connector is [YourSandwich/mautrix-teams](https://github.com/YourSandwich/mautrix-teams), pinned to v32.0. Both Linux amd64 and arm64 archives are checked against upstream release SHA-256 files, then the extracted executable is checked again. The installer runs the binary in the already pinned Steam bridge runtime image because it includes libolm; the Steam program is not started, and no Steam account is needed.

Run `npm run setup:bridges -- teams`, then Platforms → Microsoft Teams → Link. Choose the work/school or personal flow and use the Microsoft login URL displayed by the bot. Workplace authentication policies may affect login. External Microsoft login and real-contact delivery have not been verified here. The local standalone service, encrypted control-room join, and encrypted help response passed. Upstream advertises more Teams features than this app currently exposes; the app's existing external-message support remains text and incoming attachments, without Teams calls.

## Email

Platforms → Email → Connect accepts one email account with IMAP and SMTP server settings. Both servers use the same username/password. Direct TLS and required STARTTLS are supported; certificate checks stay enabled. Providers that require app passwords need a valid app password. OAuth-only mailbox sign-in is not implemented. The connection is checked before credentials replace the previous saved account.

Inbox appears as a source. Refresh and earlier-message loading are explicit. Opening a message retrieves its plain text without setting `\Seen`; Mark read is a separate action. Remote HTML and images are not rendered. Compose supports To, Cc, Bcc, arbitrary file attachments, and replies with standard Message-ID threading headers. There is no application file type or size cap; device memory and mail-provider limits still apply. SMTP acceptance is not a delivery or read receipt. Unknown delivery is reported without automatic retries. Sent-folder copies are not appended by this app; provider behavior varies.

Credentials stay in `.local/email/account.json` with private filesystem permissions; the password is never returned to the browser. Message bodies stay in browser memory and are not persisted to localStorage. Disconnect removes the saved credentials. Email uses IMAP/SMTP directly and does not need Beeper or Matrix.

`npm run verify:email` runs an isolated GreenMail fixture with a temporary trusted TLS certificate, using Docker, OpenSSL, and free local ports 3001, 33025, 33143, 33465, and 33993. It refuses to run while an email account is saved. It checks actual IMAP/SMTP login, send/read, no implicit Seen flag, exact binary attachment bytes, explicit mark-read, and reply threading; all traffic goes to the local fixture. Desktop/mobile browser tests also passed for inbox, reply with a file, and private credential fields. The fixture account and container are removed afterward. Real-provider authentication remains unverified.
