# Playback engine

The app runs its own WebTorrent + FFmpeg adapter. It does not require the Stremio desktop app or a Beeper installation.

- Stremio `infoHash`, `fileIdx`, magnet links, and tracker hints are supported. Multi-file torrents without a specified index ask which media file to play.
- Browser-compatible torrent files stream over HTTP with Range and HEAD support. Requests prioritize the file pieces needed for playback and seeking.
- Incompatible finite video (including MKV/AVI and add-on `notWebReady` sources) is converted into H.264/AAC HLS segments on demand. Seeking can request a later segment without converting every earlier segment first. HTTP sources also offer **Convert** beside Play.
- Native HLS sources use hls.js (or the browser's HLS support); their relative media/key URLs are proxied with the source's request headers.
- Add-ons → Playback engine shows availability and active sessions, and provides Stop. Changing media or closing the page releases its session. Idle sessions expire after 45 minutes. Downloads and converted segments live under the private `.local/media-cache` directory and are removed when their session/torrent is released.

## Desktop requirements

Use Node 22.19 or newer and `npm ci`. Install FFmpeg **and ffprobe** on the machine running the Node server. Both must be on PATH, or set `FFMPEG_PATH` and `FFPROBE_PATH` in the private environment file. The same Node adapter works on Windows, macOS, and Linux; no platform-specific app integration is used. FFmpeg needs libx264 and AAC encoding support. TCP torrent peers work without the optional uTP native module.

Torrent traffic requires reachable peers/trackers and can upload pieces while a session is active. A cloud HTTP proxy does not necessarily allow public BitTorrent/DHT connections. No tracker or torrent is contacted merely by viewing an add-on catalog or listing its streams.

## Verification

`npm run verify:engine` generates and locally seeds an owned fixture, verifies actual TCP torrent pieces, file-index selection, ranges, codec conversion, later-segment seeking, and cleanup. It uses no public swarm or copyrighted test title. `npm run verify:engine:fixture` exposes the owned browser fixture on port 3003 for playback checks; stop it when finished.

This is not every Stremio streaming-server protocol: YouTube `ytId`, IPFS/archive extraction, DRM, and conversion of indefinite/live inputs are not implemented. Native compatible live HLS can play without conversion. Conversion currently uses the first video and first audio stream; source-provided subtitle add-ons remain supported. Public swarms and third-party add-ons depend on network access and source availability.
