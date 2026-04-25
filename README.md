# NutriOps

Prototype SaaS B2B pour coachs performance : roster athlètes, plans nutritionnels hebdomadaires, check-ins publics, progression et export PDF.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Supabase Auth, Database, Storage
- React Router v7
- Recharts
- @react-pdf/renderer
- React Hook Form + Zod

## Setup

1. Installer les dépendances :

```bash
pnpm install
```

2. Créer un projet Supabase, puis appliquer la migration :

```bash
supabase db push
```

La migration complète est dans `supabase/migrations/001_initial_schema.sql`. Elle crée les tables, enums, indexes, politiques RLS, fonctions RPC publiques de check-in et le bucket Storage `branding`.

3. Créer `.env` à la racine :

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Lancer le projet :

```bash
pnpm dev
```

## Routes

- `/auth` : connexion et inscription coach
- `/dashboard` : roster, filtre par statut, dernier check-in, ajout athlète
- `/athletes/:id` : profil, lien check-in copiable, plan nutritionnel, progression, notes coach, export PDF
- `/checkin/:token` : formulaire public de check-in hebdomadaire
- `/settings` : profil coach, couleur primaire, upload logo, preview PDF

## Vérification

```bash
pnpm run typecheck
pnpm run build
```
