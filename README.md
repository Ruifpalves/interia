# Interia

Plataforma SaaS de geração assistida por IA de projetos de design de interiores.

> Versão 0.1 · MVP scaffolding gerado em Abril de 2026 a partir do PRD v2.

## Stack

- **Next.js 16** (App Router) + React 19
- **Tailwind 4** + shadcn-style primitives
- **Konva** para o editor 2D
- **Supabase** (Postgres + Auth + Storage + RLS)
- **AI SDK** com Claude Sonnet 4.5 + Gemini 2.5 Flash Image (via Vercel AI Gateway)
- **Puppeteer** + `@sparticuz/chromium` para PDF
- **Stripe Billing** para subscrições
- **dnd-kit** para reorder de slides

## Setup local

```bash
cp .env.example .env.local
# preencher as chaves
npm run dev
```

Migrações Supabase em `supabase/migrations/`. Aplica pela ordem:

1. `0001_init.sql` — schema completo
2. `0002_rls.sql` — políticas RLS
3. `0003_storage.sql` — buckets

## Estrutura

```
src/
  app/
    (marketing)/         landing
    (auth)/              login, signup, reset, onboarding
    (app)/               dashboard, projects, clients, team, settings, billing
    p/[slug]/            link partilhável público
    api/                 PDF, DXF, share, Stripe webhook
  components/
    editor/PlanEditor    Konva 2D editor
    project/             tabs, slide preview
    ui/                  Button, Input, Badge
  lib/
    supabase/            server, client, admin
    ai/                  Claude/Gemini clients, prompt builders, technical view generator
    pdf/                 template + Puppeteer renderer
    dxf/                 DXF writer
  server/
    actions/             Server Actions
    queries/             workspace.ts (session helpers)
  types/project.ts       Plan, Style, Briefing types
supabase/migrations/     SQL
```

## Pipelines IA

| # | Pipeline | Modelo | Custo |
|---|---|---|---|
| 1 | Briefing → Direção | Claude Sonnet 4.5 | ~0,02 € |
| 2 | Foto/Croqui → Planta inicial | Claude vision | ~0,05 € |
| 3 | Planta + Estilo → 6 renders | Claude + Gemini Image | ~0,24 € |
| 4 | Edição iterativa de render | Claude + Gemini | ~0,05 € |
| 5 | Planta → Vistas técnicas | Procedural | 0 € |
| 6 | Tudo → Dossiê PDF | Puppeteer | ~0,05 € |

## Deploy

```bash
npx vercel
```

Variáveis de ambiente: ver `.env.example`.
