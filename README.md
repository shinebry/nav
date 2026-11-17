# A daily social mockup

Run `npm run dev` and open port 3000. No dependencies or accounts are required. `npm run check` checks JavaScript syntax.

An intentionally finite chronological feed, source directory and filters, manual source imports, editable connection selections, saved/read views, and an inline editable profile card. Data and uploaded images stay in browser localStorage. Use browser site-data controls to reset the demo.

All posts and identities are sample content. External links lead to the listed source websites. Discovery, public database lookups, reverse image search, and identity / YouTube Topic verification are interface demonstrations only; no social APIs or account authentication are implemented. Custom and legacy URLs can be saved manually. No automated identity matches are claimed.

Original local SVG illustrations keep demo media available without third-party image services. Google fonts are optional; system sans-serif is the fallback.

Messaging mockup: member sources support grouped text messages, local file attachments (any file type; no application size cap, subject to browser storage capacity), microphone recording, audio playback/seeking, and local emoji reaction toggles. Media blobs stay in IndexedDB; messages and reaction state stay in localStorage. Click the microphone to start and Stop to review; holding and releasing records and sends. Nothing is delivered to another person. The browser must grant microphone access.

Presence has no manual setting. The local indicator follows connectivity and document activity: Online while active, Idle after five minutes or when hidden, Offline when disconnected. Member presence is demo data, not a live account connection. Offline sources can display last-online metadata when available. Search is accessible beneath the workspace tabs rather than in sidebar navigation.

Messages can be edited with timestamped revision history, or retracted without destroying the original text or attachments. A retracted message is collapsed behind View message. Only the sender gets edit/retract controls in the UI; this is not backend authorization.

Typing uses BroadcastChannel between same-origin local participant views and expires after inactivity. Read receipts are recorded when the other participant's message is visible in the focused, online conversation. No read event is invented from elapsed time. For local two-view testing, open the normal app and another view with `?participant=member-maya`, then open Maya's Messages in both. This is a local test identity, not authentication or cross-device messaging. Production delivery, authorization, and receipts still require a backend.

Future account requirement: assign every user an immutable, globally unique user ID. Keep it independent of editable usernames and display names. Sources, messages, receipts, reactions, and author permissions must reference that ID. Existing `self` and `member-maya` identifiers are local fixtures, not production user identities.

Settings persist username visibility and message timestamp precision (minutes, seconds, milliseconds). The Post composer above the sidebar profile stores text posts under the user's own source locally. GIF search currently uses four bundled animated GIFs without an external provider. Profile pronouns are unset by default and limited to he/him, she/her, and they/them.


Project-wide upload requirement: no application-imposed file type, file size, or attachment-count limits, in current or future upload features. Voice recordings have no artificial duration cap. Preserve arbitrary files without altering their bytes. The local prototype still depends on browser/device storage and memory; do not describe it as infinite capacity. Visual previews depend on browser format support and must not determine whether a file can be stored. Future backend infrastructure must support the same product requirement.

Calls: the conversation Call action opens a microphone preview with a live audio-level visualizer. Each participant explicitly previews and marks Ready; WebRTC negotiation begins only after both are ready. Mute/deafen apply to call tracks/playback; End releases tracks and closes the audio context. Calls remain accessible through the sidebar while navigating. Test two local participant views using the same `?participant=member-maya` route described above. Signaling uses a same-origin BroadcastChannel, not a production signaling service; no remote account is contacted. This cloud browser's managed `WebRtcIPHandling: disable_non_proxied_udp` policy prevents direct media candidates, so preview/readiness/SDP exchange and cleanup were verified, but live audio could not be verified here. Production calls need authenticated signaling and policy-compatible TURN transport. Failed connection attempts time out and release media rather than showing a false connected state.

Sources support collapsible categories with arbitrarily nested subcategories stored as a flat parent-ID hierarchy. Use + Category for a root or the + beside a category for a child; the category menu renames or moves it. Source folder controls and drag/drop move sources between categories. Parent selection excludes descendants to prevent cycles. Deleting a category moves its sources and immediate children to its parent without deleting either. Nesting has no application cap; visual indentation stops growing after four levels to preserve usable width. Category creation, moves, collapsed state, and deletion persist locally.

Publishing composer: Post, Poll, and Live modes share arbitrary file uploads stored in IndexedDB. Title and description are optional and collapsed under a secondary control. Polls have editable options and a reversible local vote. Schedules are interpreted in the profile timezone, reject past/nonexistent local times, survive reload, and publish locally when the app is open or next resumes; this is not a server scheduler. Scheduled stream announcements do not create live broadcasts. Live mode supports explicit camera/screen preview and stops tracks when closed, but Go live is unavailable without a streaming service.

Open source posts require attached files and an explicit license selection. All viewers can download files and submit a local file contribution with an optional note. Contributions are retained with the post; they are not automatically merged or published remotely. Files in sidebar navigation is an inactive placeholder as requested.

Tags: sources (including people) and categories can share reusable tags with arbitrary nonempty names and any RGB color via picker or hex input. Tag labels choose black/white text for contrast. Tag management supports applying/removing a tag, global rename/recolor, and deleting a tag from all entities. Tags and assignments persist locally. Source search also matches applied tag names.

Tag-count requirement: no application-imposed limit on the total number of tags or assignments per source/category. Preserve this in future storage and UI changes; actual capacity depends on available storage and infrastructure.

Posting supports database-backed cultural items through Item: games, shows, films, books, albums, artists, songs, and other entities. See [catalog integration notes](docs/catalog.md) for providers, network requirements, tested behavior, and the unverified Thingsbook reference. Live lookups require the saved domain changes to be applied; the current instance denied these endpoints. Selected item metadata persists with local posts; there is no invented search fallback.
