# Contributing

## Development Workflow

1. Keep application runtime code inside `src/`.
2. Keep repository automation under `.github/`.
3. Keep root-level files limited to repository metadata, docs, and deployment entry points.

## Local Verification

Always use port **4173**. One port, reused for every change — do not start a second server to get around a stale
file, and stop the old one before starting a new one:

```bash
pkill -f "http.server 4173"; python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/src/`.

### Stale modules are the trap

`http.server` sends no cache headers, so the browser holds on to `src/app/**/*.js` and `main.css`. After editing a
module, an ordinary reload can still run the previous version — which looks exactly like a bug in the code you just
wrote, and has cost real debugging time here more than once.

Fix it in the browser, not by changing port:

- **Hard reload** — `Cmd+Shift+R` (macOS) or `Ctrl+Shift+R`.
- **Keep it off while working** — DevTools → Network → *Disable cache*, with DevTools left open.

If you would rather the server never allow caching, serve with no-store headers instead:

```bash
python3 -c "import http.server as h; \
C=type('C',(h.SimpleHTTPRequestHandler,),{'end_headers':lambda s:(s.send_header('Cache-Control','no-store'),h.SimpleHTTPRequestHandler.end_headers(s))}); \
h.test(HandlerClass=C, port=4173, bind='127.0.0.1')"
```

When you are done, stop it:

```bash
pkill -f "http.server 4173"
```

## Pull Requests

Before opening a pull request:

1. Verify `src/data/bestiary.json` is valid JSON.
2. Confirm any new source files are placed under the correct `src/app/*` functional area.
3. Update `README.md` and `docs/repository-structure.md` if the repository layout changes.
