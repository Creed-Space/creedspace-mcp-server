# Working in `creedspace-mcp-server`

The canonical source is the `creedspace-mcp-server/` directory in the private
Creed Space monorepo.

The former local mirror script has been retired. It could overwrite public
security fixes and push unreviewed working-tree state. npm publication now
occurs only through the monorepo's protected, exact-tag
`.github/workflows/mcp-server-release.yml` workflow.

## If you want to change something

- **Bug reports & feature requests:** open a GitHub issue here — that's the right
  place and it's watched.
- **Code and documentation changes:** propose them against the canonical
  monorepo source. Changes to a separate public repository do not become release
  inputs unless they are reviewed and incorporated upstream.

## Where it's published

- **npm:** `@creedspace/mcp-server`. Install an exact version without lifecycle scripts with `npm install --global --ignore-scripts --save-exact @creedspace/mcp-server@<version>`, then run `creedspace-mcp`.
- **Official MCP Registry:** `io.github.Creed-Space/creedspace-mcp-server` (see `server.json`).
- Registry availability is verified separately from repository source.

The registry namespace is owner-based (`io.github.Creed-Space/…`), so it stays valid
independent of this repo's name — the listing points at the npm package, not a
clone of this repo.

## Using the server

See [`README.md`](README.md) for install/config and the tool reference. More at
<https://www.creed.space/mcp>.

---

_Maintainer: Nell Watson · Project: <https://www.creed.space>_
