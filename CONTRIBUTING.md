# Working in `creedspace-mcp-server` — read this first

**This repository is a published mirror, not the source of truth.**

`creedspace-mcp-server` is the public, installable home of the Creed Space MCP
server — constitutional-AI safety guardrails for any LLM. Its contents are
**generated and mirrored** from a private monorepo. Anything you edit *here* will
be **silently overwritten** the next time the maintainer runs the release sync
(`scripts/sync-to-public.sh`).

## If you want to change something

- **Bug reports & feature requests:** open a GitHub issue here — that's the right
  place and it's watched.
- **Code / docs changes:** these are authored upstream in the private monorepo
  and mirrored out. A pull request against this repo can't be merged in the
  normal way (the sync would clobber it), but it is very welcome as a
  **proposal** the maintainer can apply upstream — describe the intent clearly
  and it will be carried across.

## Where it's published

- **npm:** `@creedspace/mcp-server` — run with `npx @creedspace/mcp-server`.
- **Official MCP Registry:** `io.github.Creed-Space/creedspace-mcp-server` (see `server.json`).
- Rolling out across mcp.directory, mcpservers.org, PulseMCP, mcp.so, Glama, and Smithery.

The registry namespace is owner-based (`io.github.Creed-Space/…`), so it stays valid
independent of this repo's name — the listing points at the npm package, not a
clone of this repo.

## Using the server

See [`README.md`](README.md) for install/config and the tool reference. More at
<https://www.creed.space/mcp>.

---

*Maintainer: Nell Watson · Project: <https://www.creed.space>*
