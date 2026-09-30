# New Era Hub 241

Boutique en ligne de streetwear — casquettes, vêtements, chaussures et accessoires. Catalogue, panier, tunnel de commande avec finalisation sur WhatsApp, et un back-office complet pour piloter tout le catalogue et l'activité commerciale sans toucher au code.

## Stack technique

- **Framework** : [TanStack Start](https://tanstack.com/start) (React 19, SSR) + [TanStack Router](https://tanstack.com/router)
- **Style** : Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)
- **Données** : [Supabase](https://supabase.com) (Postgres, Auth, Storage) — schéma versionné dans `supabase/migrations/`
- **Données côté client** : [TanStack Query](https://tanstack.com/query)
- **Build** : Vite 8 + Nitro (déploie sur Vercel, auto-détecté au build)

## Fonctionnalités

**Site public** — accueil, boutique avec filtres et favoris, fiche produit (variantes, couleurs, avis clients), panier, tunnel de commande, facture PDF, suivi de commande par code, pages légales.

**Back-office** — interface d'administration protégée par authentification (Supabase Auth + RLS), accessible via une URL dédiée non indexée :
- Produits, catégories, couleurs et variantes, avec upload de photos (compression et fond blanc automatiques)
- Stocks et alertes de rupture
- Commandes : suivi, statuts, historique de réception
- Promotions et codes promo, avec règles de bundle
- Comptabilité : dépenses, rentabilité, export PDF
- Avis clients et notifications

**Sécurité des données** — toute la logique métier sensible (prix, stock, création de commande) est vérifiée côté serveur par des fonctions Postgres (`create_order`, `adjust_stock`) : le client ne peut jamais imposer un prix ou une quantité, quoi qu'il envoie.

## Démarrer en local

```bash
npm install
cp .env.example .env   # puis renseigne les valeurs (voir supabase/README.md)
npm run dev
```

Le site tourne sur [http://localhost:8080](http://localhost:8080).

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Sert le build de production en local |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run format` | Formate le code avec Prettier |

## Structure du projet

```
src/
  routes/          Pages (routing par fichiers TanStack Router — voir src/routes/README.md)
  components/       Composants partagés (header/footer, cartes produit, formulaires...)
  lib/
    api/            Accès aux données Supabase (produits, commandes, stock, paramètres, auth)
    cart.ts         Panier client (avant commande, pas encore en base)
    types.ts        Types du domaine (Product, Order, StoreSettings...)
  integrations/
    supabase/       Client Supabase et types générés depuis le schéma
supabase/
  migrations/       Schéma SQL, RLS, fonctions serveur — source de vérité de la base
  README.md         Comment appliquer les migrations et créer le premier compte admin
```

## Base de données

Toute la logique métier sensible (prix, stock, création de commande) est vérifiée côté serveur via des fonctions Postgres (`create_order`, `adjust_stock`) — le client ne peut jamais imposer un prix ou une quantité. Voir `supabase/README.md` pour appliquer le schéma et créer un compte administrateur.

## Déploiement

Le projet est connecté à Vercel : chaque `git push` sur `main` déclenche un déploiement automatique. Les variables d'environnement (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, et leurs équivalents `VITE_*`) doivent être configurées dans les paramètres du projet Vercel.
