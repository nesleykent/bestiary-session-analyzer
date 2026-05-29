# Contributing

## Development Workflow

1. Keep application runtime code inside `src/`.
2. Keep repository automation under `.github/`.
3. Keep root-level files limited to repository metadata, docs, and deployment entry points.

## Local Verification

Run a local static server before testing browser behavior:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/src/`.

## Pull Requests

Before opening a pull request:

1. Verify `src/data/bestiary.json` is valid JSON.
2. Confirm any new source files are placed under the correct `src/app/*` functional area.
3. Update `README.md` and `docs/repository-structure.md` if the repository layout changes.
