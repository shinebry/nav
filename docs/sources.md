# Sources

Import a public profile, website, RSS or Atom link from Sources. Search can find public identities or accept a URL. Open a source to refresh its enabled connections; Today refreshes configured sources when clicked. No polling, autoplay, suggested accounts, or sample updates are enabled by default. Reload restores cached updates without making provider requests.

**Manage** holds the name, type, enabled accounts, applicable sections, and provider setup. Find accounts uses public database identifiers and explicit website ownership links. Names alone produce candidates to confirm. Sources with the same confirmed Wikidata identity are combined without duplicating workspace tabs. YouTube Topic channels require corroboration from both Wikidata and MusicBrainz; otherwise they remain separate.

## Feeds

| Provider | Implementation |
| --- | --- |
| RSS / Atom, including podcasts | Public posts, originals, enclosure playback |
| Bluesky | Public author feed, paginated; reposts excluded |
| YouTube | Exact-channel video RSS and publicly available community posts with matching author channel |
| Bandcamp | Public artist catalog and publicly exposed audio streams on album/track pages |
| Spotify | Exact artist's album catalog through the official API; client credentials required |
| X | Official API author posts; bearer token and provider API access required |
| Bandsintown | Exact artist's public structured events, or API with registered app ID |
| Mastodon / Tumblr / Reddit | Their available public RSS feeds; provider restrictions can block access |
| Other social links | Saved as profile links; no claim of supported ingestion |

Private or unavailable feeds are not bypassed. Spotify catalog access does not grant full-track playback. Historical completeness depends on each provider's API/feed. Earlier-post controls appear only when a provider supplies a cursor. YouTube community and Bandcamp public-page parsers can need maintenance when those sites change.

## Profiles and media

Banner/avatar cards have separate Updates, Videos, Music, Features, Books, Films, Events, Recommendations, and About sections when supported by public records or connected feeds. Include controls persist per source. Music uses compact rows. About is displayed only when clicked.

Public adapters use Wikidata identifiers, public account links, facts, available imagery, Wikipedia biography summaries, MusicBrainz release groups, Open Library author works, and Wikidata work statements with references and contributor roles. Credits require reference URLs. There is no AI-generated biography, identity, or credit data. Artist/author database catalogs and credit queries are bounded public queries, not guarantees of exhaustive histories.

Recommendations require an explicitly authored recommendation, exactly one titled referenced item, a quote, and an original proof link. Negative statements, reposts and quotes are excluded. Manually reviewed records can also be supplied in private `.local/source-recommendations.json`, keyed by Wikidata ID:

```json
{"Q123": [{"title": "A book", "kind": "books", "url": "https://example.org/book", "evidence": {"url": "https://creator.example/posts/recommendation", "quote": "Their explicit recommendation", "verified": true}}]}
```

The evidence URL must belong to that source's known account or website. Proof exposes the quote and original; automatic text matching is not a claim of infallible attribution.

## Stacks, Saved, and read state

Exact original URLs or matching cross-platform text/media are stacked conservatively within the same source. Expanded stacks show each original's content and direct link. Split and manual grouping controls correct mistaken matches. Read and Saved apply to the stack's variants; connection removal, disabling, or source unfollowing retains cached saved items. Changed content becomes unread. Refresh failures retain the last successful cache and display the failed connection.

## Image attribution

Image URL search provides Google Lens and TinEye handoffs without credentials. In-app attribution candidates, including uploaded images, use SauceNAO with an API key. Candidate links are not automatically verified creator identities. Uploaded images are forwarded for the requested search and not stored by this app.

## Configuration and verification

Manage → provider Setup stores optional Spotify, X, Bandsintown and SauceNAO credentials privately in `.local/source-credentials.json` with mode 0600. Environment equivalents are `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `X_BEARER_TOKEN`, `BANDSINTOWN_APP_ID`, and `SAUCENAO_API_KEY`. Configuration responses expose only whether a key is configured. Do not commit keys. Cached normalized records are private in `.local/source-cache.json`.

The deployment must allow provider API, artwork and chosen feed/media domains. The restricted cloud environment may require its saved network configuration to be applied first; adding a URL does not modify network policy. Custom Mastodon/website feeds need their own host grants. No key can overcome a provider's account permissions or API plan restrictions.

Run `npm run check` and `npm test`. `npm run verify:sources:fixture` starts the actual app API on port 3004 with owned HTTP provider fixtures; it is not a live-provider verification. Desktop checks cover import, identity/account discovery, feed ingestion, stack originals/read/save/split, proof, catalog/provider setup, cached failures and reload, public audio playback, and image attribution. Live public RSS was separately checked against Node.js's GitHub commit Atom feed. Credentialed provider logins and live Wikidata/YouTube/etc. are not verified by fixtures.

With Playwright and Chromium installed, run `node scripts/verify-sources-desktop.cjs` against a fresh fixture server. `NAV_PLAYWRIGHT_MODULE` and `NAV_CHROMIUM_PATH` can point to existing installations. The fixture's test-only credentials/cache are isolated in a temporary directory and removed when its process exits. Restart the fixture between desktop runs to reset provider credentials.

## Backup, recovery, and corrections

Settings → Data exports a versioned JSON backup containing sources, category/folder trees, tags, profile/settings, read/Saved state, local messages and posts, media collections and their attachments, player preferences, workspace tabs, and cached Source records. Provider credentials and external services' accounts are not included. Restore previews counts, verifies the checksum and supported schema, then replaces this app's local data. Failed writes trigger rollback. Keep the downloaded file private; it contains your messages and media. Backups are bounded by available browser memory/disk, with no application file-size cap. Close other app windows before restoring to avoid competing writes. File-backed media already imported into the app is included; external URLs remain external URLs.

Source caches use atomic writes and a previous valid on-disk snapshot. An old in-flight refresh cannot overwrite a restored cache. Browser data stays on its original origin, so moving to another host/port requires exporting and restoring. Version 1 backups are explicitly checked; unsupported future formats are rejected without changing data. Media add-on registrations and Matrix/email credentials are server configuration and require separate setup on a new computer.

Manage shows each connection's last successful refresh and a Retry button for failed connections. Removing an account excludes it from automatic discovery; Excluded accounts can restore it explicitly. Merged sources → Separate moves selected accounts back to their original source, preserves IDs/read/Saved references, and stores a separation rule that survives reloads. Reject linked identity removes that public identity and excludes it from automatic rediscovery; a different identity can be selected in About. Explicitly choosing the rejected identity again overrides that rejection.

Run `npm run verify:sources:live` for actual read-only provider checks. It does not use fixtures or add subscriptions, and stores temporary fetched records outside the app's cache. Results distinguish successful access, network/provider failures and missing credentials. No credentials are printed. Optional `SOURCE_VERIFY_BANDSINTOWN_URL`, `SOURCE_VERIFY_SPOTIFY_ARTIST`, and `SOURCE_VERIFY_X_USER` select verification targets. Bandsintown is only checked with an explicitly supplied target; image-attribution requests are left to an actual chosen image rather than spending quota automatically.

For desktop backup/correction checks, run `node scripts/verify-source-essential-desktop.cjs` against a fresh Sources fixture server with the same Playwright/Chromium variables described above. It checks actual downloaded backups, invalid imports, rollback after a failed write, binary attachment equality, nested folders/tags/settings, saved/read restoration, persistent identity separation and an individual failed-connection retry.

## Search and individual saves

The existing search bar is contextual: in a public source it filters that source's currently loaded Updates or media section; in Saved it filters saved items; inside a collection it filters that collection, including descendant folders during a search. Source and collection filtering is local and makes no provider request while typing. Submitting a source query stays in its existing workspace tab. Use the existing new-search tab button for a global lookup. Global search includes cached public updates alongside source and media results, honoring enabled connections and platform/type filters. Provider feeds and public database sections still determine which records are available; this is not a claim of full-history search on every social network.

Public-source search results offer View without following the source. The profile's bookmark icon explicitly follows/unfollows it. Saving an individual post or media item does not change that subscription. Saved → All includes posts and media; Posts retains the update-list view. Saved posts preserve content and original variant links independently of following. They can be added to collections using Edit or a collection's Add items control. Search matches full post text, original variants, media titles, artists, and credits. Re-saving keeps existing titles and collection assignments. Unsaving a post from either Saved view also updates the other view. Existing cached post bookmarks migrate to collection-ready records on reload.

`node scripts/verify-source-search-desktop.cjs` checks these flows against the owned Sources fixture server, using the same Playwright/Chromium variables as the other desktop checks. It also checks that typing sends no provider requests, Enter does not duplicate tabs, reload retains individual saves, and old post-ID bookmarks migrate.
