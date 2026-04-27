# NutriOps

Prototype SaaS B2B pour coachs performance : roster athlètes, readiness quotidien, planification entraînement, cibles nutrition journalières, alertes coach, check-ins publics et export PDF.

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

2. Créer un projet Supabase, puis appliquer les migrations :

```bash
supabase db push
```

Le schéma complet est dans `supabase/migrations/001_initial_schema.sql`. La migration `002_daily_training_features.sql` permet de mettre à jour une base qui avait déjà appliqué l’ancien `001`.

Tables principales :

- `coaches`, `athletes`
- `checkins` quotidiens avec énergie, sommeil, soreness, stress, motivation, faim, digestion et adhérence nutrition
- `daily_nutrition_targets` pour les calories/macros par date
- `nutrition_meal_items` pour détailler les repas, collations, quantités et macros de chaque journée
- `training_sessions` pour les séances prévues/réalisées, RPE et charge interne
- `athlete_alerts` pour stocker les alertes coach
- `coach_notes`

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
- `/dashboard` : vue coach du jour, readiness, séances, nutrition, alertes et roster
- `/athletes` : roster complet
- `/athletes/:id` : overview, check-ins quotidiens, training planner, nutrition quotidienne, progression, export PDF
- `/plans` : couverture hebdomadaire nutrition + entraînement
- `/reports` : exports PDF par athlète
- `/checkin/:token` : formulaire public quotidien avec séance(s), nutrition cible et feedback post-séance
- `/settings` : profil coach, couleur primaire, upload logo, preview PDF

## Vérification

```bash
pnpm run typecheck
pnpm run build
```
