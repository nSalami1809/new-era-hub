# Supabase — NEW ERA HUB 241

Ce projet est connecté à un projet Supabase déjà provisionné (`aheecixtobmhmngruzvz`,
voir `.env`). La base est actuellement **vide** : les migrations dans
`supabase/migrations/` créent tout le schéma (produits, commandes, stocks,
paramètres, rôles admin) mais doivent être appliquées manuellement — l'agent
qui a écrit ces fichiers n'a pas d'accès direct à ce projet.

## 1. Appliquer les migrations

Depuis ce dossier, avec la [Supabase CLI](https://supabase.com/docs/guides/cli) :

```bash
supabase login
supabase link --project-ref aheecixtobmhmngruzvz
supabase db push
```

## 2. Créer le premier compte admin

Les migrations ne créent aucun utilisateur (Supabase Auth n'est pas gérable en
SQL simple). Depuis le Dashboard Supabase → **Authentication → Users → Add
user**, crée un compte avec ton email et un mot de passe. Copie l'UUID généré,
puis dans le **SQL Editor** :

```sql
insert into public.user_roles (user_id, role)
values ('<uuid-de-l-utilisateur>', 'admin');
```

Sans cette ligne, personne n'est admin : toutes les écritures (produits,
stocks, commandes, paramètres) resteront refusées par les policies RLS.

## 3. Vérifier

```sql
select public.is_admin(); -- doit renvoyer true une fois connecté avec ce compte
```

## Ce que fait chaque migration

| Fichier | Contenu |
|---|---|
| `20260920000001_extensions_and_helpers.sql` | Extension `pgcrypto`, enum `order_status`, trigger générique `updated_at` |
| `20260920000002_products.sql` | Table `products` |
| `20260920000003_store_settings.sql` | Table `store_settings` (ligne unique) |
| `20260920000004_orders.sql` | `orders`, `order_items`, `order_status_history` + trigger de traçabilité automatique des statuts |
| `20260920000005_stock_movements.sql` | Historique des mouvements de stock |
| `20260920000006_roles_and_rls.sql` | `user_roles`, fonction `is_admin()`, activation RLS + policies sur toutes les tables |
| `20260920000007_order_functions.sql` | `create_order()` (seul chemin de création de commande, prix/stock revérifiés serveur), `get_order_receipt()` (lecture facture invité par id), `adjust_stock()` (ajustement stock admin tracé) |

## À venir (prochaine étape)

Un bucket Supabase Storage pour l'upload réel des photos produit (actuellement
un simple champ URL côté admin) sera ajouté dans une migration séparée quand
on branchera l'upload d'images.
