# Publicar no npm

[English](../publishing.md) | **Português**

O pacote é publicado a partir do GitHub. Um **Release** na branch `main` dispara `.github/workflows/publish.yml`, que roda `prepublishOnly` (typecheck, testes e `pnpm build`) e envia `dist/`, `scripts/` e `assets/` ao npm.

## Uma vez: conta e permissão

1. Crie uma conta em [npmjs.com](https://www.npmjs.com/signup) e ative 2FA.
2. No GitHub do repositório, Settings → Secrets and variables → Actions, crie o secret **`NPM_TOKEN`** com um Access Token do npm (Automation), **ou** configure [Trusted Publisher](https://docs.npmjs.com/trusted-publishers) apontando para este repositório e o workflow `publish.yml`.
3. O `package.json` já declara `publishConfig.access: public` e `provenance: true`. A Action tem `id-token: write` para o provenance.

O nome no registry é `@caiorafael/patchwork`:

```bash
pnpm add @caiorafael/patchwork
```

## Publicar uma versão

1. Atualize `version` no `package.json` (semv):

```bash
pnpm version patch   # 1.0.0 → 1.0.1
pnpm version minor   # 1.0.0 → 1.1.0
pnpm version major   # 1.0.0 → 2.0.0
```

`pnpm version` cria o commit e a tag `v1.0.1` (ajuste a mensagem se quiser Conventional Commits).

2. Envie a branch e a tag:

```bash
git push origin main --follow-tags
```

3. No GitHub: **Releases → Draft a new release**. Use a tag recém-enviada (`v1.0.1`), publique o release.

O workflow **Publish npm** sobe o pacote. Confira em [npmjs.com/package/@caiorafael/patchwork](https://www.npmjs.com/package/@caiorafael/patchwork).

Publicação manual (mesma Action): **Actions → Publish npm → Run workflow**.

## O que entra no tarball

| Incluído | Fora do pacote |
|---|---|
| `dist/` (JS + `.d.ts` + sourcemap) | `src/`, testes |
| `scripts/render-text.swift` | `examples/`, `compositions/` |
| `assets/` | `docs/`, workflows |
| `LICENSE`, `README.md`, `README.pt-BR.md` | `tmp/`, `node_modules/` |

Consumidores Node/TypeScript importam o build em `dist/`. FFmpeg continua sendo dependência de **sistema**, não do npm.

## Conferir localmente antes do release

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm publish --dry-run --no-git-checks
```

`pnpm publish --dry-run` lista o que iria para o npm, sem publicar.
