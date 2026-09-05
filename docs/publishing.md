# Publishing to npm

**English** | [Português](pt-BR/publishing.md)

The package is published from GitHub. A **Release** on the `main` branch triggers `.github/workflows/publish.yml`, which runs `prepublishOnly` (typecheck, tests, and `pnpm build`) and uploads `dist/`, `scripts/`, and `assets/` to npm.

## One-time: account and permission

1. Create an account at [npmjs.com](https://www.npmjs.com/signup) and enable 2FA.
2. In the GitHub repository, Settings → Secrets and variables → Actions, create the **`NPM_TOKEN`** secret with an npm granular access token (read and write, Bypass 2FA), **or** configure a [Trusted Publisher](https://docs.npmjs.com/trusted-publishers) pointing at this repository and the `publish.yml` workflow.
3. `package.json` already declares `publishConfig.access: public` and `provenance: true`. The Action has `id-token: write` for provenance.

The registry name is `@caiorafael/patchwork`:

```bash
pnpm add @caiorafael/patchwork
```

## Publish a version

1. Bump `version` in `package.json` (semver):

```bash
pnpm version patch   # 1.0.0 → 1.0.1
pnpm version minor   # 1.0.0 → 1.1.0
pnpm version major   # 1.0.0 → 2.0.0
```

`pnpm version` creates the commit and the `v1.0.1` tag (adjust the message if you want Conventional Commits).

2. Push the branch and the tag:

```bash
git push origin main --follow-tags
```

3. On GitHub: **Releases → Draft a new release**. Use the tag you just pushed (`v1.0.1`) and publish the release.

The **Publish npm** workflow uploads the package. Check [npmjs.com/package/@caiorafael/patchwork](https://www.npmjs.com/package/@caiorafael/patchwork).

Manual publish (same Action): **Actions → Publish npm → Run workflow**.

## What goes in the tarball

| Included | Out of the package |
|---|---|
| `dist/` (JS + `.d.ts` + sourcemap) | `src/`, tests |
| `scripts/render-text.swift` | `examples/`, `compositions/` |
| `assets/` | `docs/`, workflows |
| `LICENSE`, `README.md`, `README.pt-BR.md` | `tmp/`, `node_modules/` |

Node/TypeScript consumers import the build in `dist/`. FFmpeg remains a **system** dependency, not an npm dependency.

## Check locally before a release

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm publish --dry-run --no-git-checks
```

`pnpm publish --dry-run` lists what would go to npm, without publishing.
