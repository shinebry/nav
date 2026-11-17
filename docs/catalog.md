# Cultural items in posts

The Item action searches a selected public catalog only after the user submits a query. No recommendations or trending results are requested. A selected item stores the provider's ID, title, creator/description, date where available, artwork URL where provided, and canonical database URL. Cards remain inside collapsed updates until opened. Title/description on the post remain optional; an item can be posted alone.

| Type | Database | Coverage / limitations |
| --- | --- | --- |
| Books | Open Library search + Covers API | Work metadata, authors, publication year, cover where available |
| Shows | TVmaze search | Series metadata, genres, premiere year, poster |
| Games | Steam store search | Steam catalog; not every game/platform |
| Albums | Apple iTunes Search API | US catalog, artist, release date, artwork |
| Artists | Apple iTunes Search API | Names/genres and artist link; no portrait invented if missing |
| Songs | Apple iTunes Search API | Recording metadata, artist, release date, artwork |
| Films | Apple iTunes Search API | US catalog, movie metadata and artwork |
| Other | Wikidata entity search + P18 image claim | Broad entities, descriptions, optional Wikimedia artwork |

Server adapter lives in catalog.js. Endpoints are selected from a fixed provider table, not caller-supplied URLs. Curl respects the environment's existing proxy and TLS verification; there is no network bypass. Responses are bounded and successful searches cached for five minutes. Failure remains an error, not an empty list or invented records. Browser UI uses same-origin /api/catalog, avoiding provider CORS dependency.

References:
- https://openlibrary.org/dev/docs/api/search
- https://openlibrary.org/dev/docs/api/covers
- https://www.tvmaze.com/api
- https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
- https://store.steampowered.com/api/storesearch/
- https://www.wikidata.org/w/api.php

These are integration reference URLs, not a claim they were retrieved during this session. The runtime denied direct access to these domains. Live data could not be verified; provider adapters and UI were tested using explicit fixtures. A request through the real server returned HTTP 503 under the current network policy.

Required custom network destinations saved in environment draft:
openlibrary.org, covers.openlibrary.org, itunes.apple.com, *.mzstatic.com, api.tvmaze.com, static.tvmaze.com, store.steampowered.com, *.steamstatic.com, www.wikidata.org, commons.wikimedia.org, upload.wikimedia.org.

Thingsbook research remains unverified: thingsbook.app, thingsbook.com, and www.thingsbook.com returned proxy access denials. A GitHub repository search found unrelated projects with that name. The exact product URL was requested. Current interaction implements the user's described visual item attachment flow; it does not claim to reproduce a verified Thingsbook feature set.

Presentation: item artwork is mapped to solid CSS 3D geometry. Books have cover/page edges; films/shows and games use distinct cases; albums use sleeves with a record; songs use a disc; artists/other items use framed artwork. Components share the same rendering in search, composer, and published posts. Missing artwork retains the corresponding shape with an initial. No gradient backgrounds or automatic rotation are used. The visual showcase uses original illustrative fixtures, not live catalog artwork.
