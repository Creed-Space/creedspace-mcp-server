# Changelog

All notable changes to the creedspace-mcp-server package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Analytics module for privacy-respecting usage tracking
- API key management system
- CI/CD pipeline with GitHub Actions
- Enhanced TypeScript types
- Comprehensive documentation

### Changed
- Improved error handling with better messages
- Optimized caching strategy

### Security
- Added API key validation
- Enhanced CORS configuration

## [1.1.2] - 2026-07-03
### Security
- **Rate limiting** on the HTTP `/mcp` endpoint (per-IP, in-memory; default 120 req/min, override via `CREEDSPACE_RATE_LIMIT`). `/health` is exempt so platform health probes never trip it; a 429 returns a JSON-RPC error (code -32029).
- **`trust proxy` = 1 hop** so the limiter keys on the real client IP behind Render's / a gateway's load balancer, not a spoofable `X-Forwarded-For` wildcard.
- **Explicit JSON body-size cap** (`express.json({ limit: '1mb' })`, override via `CREEDSPACE_MAX_BODY`) to reject oversized-payload abuse.
- **Security headers** on every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`; the `X-Powered-By` header is disabled.
- The wildcard-CORS startup guard now honours the same `MCP_ALLOW_INSECURE_HTTP=true` opt-out as the non-loopback-bind guard, so an intentionally-public (gateway/proxy-fronted) deployment can serve anonymous CORS without an API key.

### Changed
- `creedspace-mcp --version` now reports the real package version (was hard-coded to `1.1.0`), sourced from `version.ts`.

### Added
- `express-rate-limit` as a direct dependency.
- Regression test covering the CORS guard opt-out under `MCP_ALLOW_INSECURE_HTTP=true`.

## [1.1.1] - 2026-07-03
### Added
- `LICENSE` file (MIT) — the license was declared in `package.json` but no file was present.
- `mcpName` field in `package.json` (`io.github.Creed-Space/creedspace-mcp-server`) for Official MCP Registry npm ownership.
- Ecosystem-publishing metadata: rewritten `server.json` (2025-12-11 registry schema), `Dockerfile`, `glama.json`, `CONTRIBUTING.md`, and `scripts/sync-to-public.sh` for the public mirror repo.

### Changed
- `server.json` migrated to the Official MCP Registry `2025-12-11` schema; `repository.url` now points at the public mirror `Creed-Space/creedspace-mcp-server`.
- Repository URLs updated from `nellwatson/*` to `Creed-Space/creedspace-mcp-server` across README/CHANGELOG/smithery.
- **Privacy**: usage telemetry is now **opt-in** (`CREEDSPACE_ANALYTICS_OPT_IN=1`); it was previously enabled by default (opt-out). The analytics module is not currently wired into the CLI/server, so no metrics were being sent regardless.

### Fixed
- `set_persona` enum accepted `mediator` but rejected `anchor`; corrected to the documented six personas (ambassador, nanny, sentinel, godparent, muse, anchor).

### Reserved
- Four VCP protocol-interop tools (`vcp_present_attestation`, `vcp_verify_peer`, `vcp_check_compatibility`, `vcp_negotiate_values`) are declared upstream but not yet implemented in the request handler; they are excluded from the advertised tool list for this release so no non-functional tools are published. The server now advertises 16 fully-implemented tools.

## [1.0.0] - 2025-09-05
### Added
- Initial release
- 10 MCP tools for constitution management
- 6 AI personas (Ambassador, Nanny, Sentinel, Godparent, Muse, Anchor)
- Offline caching support
- TypeScript implementation
- CLI interface
- Configuration file support
- Environment variable support
- Claude Desktop integration
- Continue.dev integration
- VS Code/Cursor integration

### Features
- `get_constitution` - Get merged constitution for persona
- `list_personas` - List all available personas
- `set_persona` - Switch active persona
- `get_uvc_qualities` - Get UVC qualities
- `get_system_prompt` - Get complete system prompt
- `preview_export` - Preview export configuration
- `get_constitution_by_id` - Get specific constitution
- `search_constitutions` - Search constitution library
- `get_active_persona` - Get current persona
- `clear_cache` - Clear local cache

## Installation

```bash
npm install creedspace-mcp-server
# or
npx creedspace-mcp-server --persona ambassador
```

## Links
- [NPM Package](https://www.npmjs.com/package/@creedspace/mcp-server)
- [Documentation](https://github.com/Creed-Space/creedspace-mcp-server)
- [Creed Space](https://www.creed.space)