# Media search, Saved, and add-ons

The main search bar looks up media through connected add-ons and external databases. Saved is the media library: opening a result or playing a preview does not save it. The existing saved-posts view remains accessible through Posts. The player's folder/artwork button opens saved media.

Saved supports collections (arbitrary names, one per line), movie/show/music filters, series and season/episode selection, album/artist grouping, title/recent sorting, search, and resume views. Import files is optional; importing a file explicitly adds it to Saved. Unsave removes its saved status while retaining an imported file as an available local source. Saved records and files live in the browser's IndexedDB; external Saved results are metadata/source references. Starting a torrent explicitly downloads pieces into the private server-side playback cache.

## Add-ons

Saved → Add-ons → Add accepts an HTTP add-on `manifest.json` URL, including configured URLs and `stremio://` links. Remote manifests require HTTPS; localhost HTTP is supported for self-hosted desktop add-ons. The application is a standalone HTTP protocol client. It does not embed or require the Stremio application or an account. The official add-on SDK is a development-only test dependency.

Supported:

- Manifest discovery and string/object resource declarations, types and ID-prefix filtering.
- Catalog browsing, search-capable catalogs in the main search bar, required extras, and older `extraSupported` declarations.
- Detailed metadata, posters/artwork, cast, and video/season/episode data.
- Stream discovery, direct HTTP(S) media through a local Range-capable proxy, and external playback links.
- Inline `video.streams` supplied by metadata, including their exclusive source behavior.
- Subtitle resources and stream-provided subtitles, with video ID/size and the standard OpenSubtitles file hash for sufficiently large local files.

Requests are made in response to user searches, explicit catalog browsing, playback source selection, or enabled automatic metadata matching during import. Catalogs are not recommendations and are not loaded as a feed on launch. Add-on `player` and `library` activity-reporting resources are not invoked. Automatic next-episode playback is not introduced.

Torrent hashes/magnets, exact torrent file indexes, browser-compatible torrent streams, native HLS and FFmpeg conversion of finite video are implemented by the standalone [playback engine](playback-engine.md). Unsupported protocols (including YouTube-specific IDs, IPFS, NZB/archive extraction and DRM) remain explicit. Add-ons requiring configuration should be configured with their provider before pasting the ready manifest URL.

Configured transport URLs can contain keys and are stored server-side in `.local/media-addons.json` with private file permissions. The installed list exposes manifest details and an opaque key, not the configured transport URL. Playback uses temporary local tickets; provider-request headers stay on the server. API routes accept local, same-origin access only. Credentials must be entered in the local application, not chat.

## Metadata and cast

Automatic metadata searches connected search-capable add-ons and database providers when enabled. Filename parsing recognizes release years and SxxExx episode markers. A single exact title/year match may be applied automatically; ambiguous results remain for manual Match metadata selection. Matching runs sequentially and does not overwrite edits or resurrect deleted files while a lookup is pending. Turn Automatic metadata off in Saved to stop future matching. File contents remain local; title queries are sent to the lookup providers.

Movie/show defaults use Cinemeta's HTTP metadata service. Music defaults use Apple's catalog; album/artist/book/game searches also use the existing catalog adapters. Cast appears only after pressing Cast and only contains information supplied by the provider. Missing cast remains unavailable. Artwork is supplied by the database/add-on; no artwork or identity match is invented.

## Music for a title

Open a movie/show result → Music. Search returns published soundtrack albums; choose an album to see its available tracklist. Track totals are compared with the provider's album count; partial lists show their returned/expected counts. This is not a guarantee of every song or unreleased cue heard in a film/episode.

Preview plays the provider's available sample, clearly marked Preview. Save stores the selected track in Saved; Save album saves the available tracklist. Saving metadata does not provide a full-song license or download. Music supplied directly by a connected add-on can use that add-on's playback sources. The Apple catalog's availability and previews depend on its region and inventory.

## Validation

`npm run check` and `npm test` cover the app and protocol/data helpers. The fixture under `test/fixtures/media-platform.cjs` uses the real official add-on SDK to test manifest/catalog/meta/stream/subtitles and inline streams. It serves synthetic movie/show/cast/album data and locally generated media on ports 3001/33333, and redirects the default Cinemeta/Apple requests only inside that test process. These fixture results do not establish live third-party catalog correctness. It requires development dependencies, ffmpeg, and no installed add-ons in this checkout; stop it to clean up its registry and temporary files.

Browser checks passed main-bar media search, explicit Saved behavior, cast, album tracklists, previews and saving, HTTP Range playback, add-on subtitles, automatic metadata/artwork matching, collection persistence, season/episode selection, and mobile layout. A real HTTPS integration also passed the official public static Big Buck Bunny add-on's manifest, catalog, metadata and stream listing; its media was not downloaded or played during that check.

The current cloud network policy blocks `v3-cinemeta.strem.io` and `itunes.apple.com`, so live searches from those services remain unverified here. Those domains and any chosen add-on/media/artwork hosts need network access in the running environment. No environment was published or GitHub push made by this change.

References:

- https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/protocol.md
- https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
- https://github.com/Stremio/stremio-static-addon-example
- https://performance-partners.apple.com/search-api

Saved collections can contain nested folders with no application depth or count cap. New collections use the currently open folder as their default parent. Use a folder's Move control or drag it onto another folder; move it to Saved using the root breadcrumb. Moving a folder preserves its descendants and media memberships, and self/descendant moves are rejected. Folder search includes descendant folders and media. Existing flat collections remain at the root until moved; hierarchy persists locally alongside the existing collection registry.
