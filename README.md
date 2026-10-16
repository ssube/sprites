# Sprites — Living Context

An interactive field guide to persistent agents, bounded sessions, message routing,
and reviewed learning. Agent domains describe responsibilities, not identities.

## Static and public

The site runs entirely in the browser: no live controls, analytics, remote fonts,
external embeds, credentials, private source links, or individual agent profiles.
The message-flow demonstrations are synthetic.

Monitoring shows real approved **combined** tool counts: 26,323 calls, 24,849
successes and 1,474 errors. The observation window is October 3–10, 2026, with exact
UTC bounds in the site. These are recorded observations, not a live counter or a
claim that tasks were completed. No per-agent breakdowns, timings, skill activity,
review records, commands or transcripts are published.

## Preview

Serve `docs/` with any static HTTP server. For example:

```sh
python3 -m http.server 8000 --directory docs
```

Assets use relative paths and work under a Pages project URL. Knowledge-check
progress and motion preference stay in browser storage. Keyboard navigation,
small-screen layouts, enlarged text and reduced motion are supported.

## Publish

This repository contains only the reviewed public bundle and a fresh history.
GitHub Pages serves the `docs/` directory of the `main` branch using its standard
branch publishing. No custom workflow or additional token scopes are required.
Only the ten-file static inventory is served; review content and privacy before
every push because updates to this branch publish automatically.
