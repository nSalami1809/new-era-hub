# Supabase — New Era Hub 241

Projet Supabase indépendant (`lrwirmjzojvocgfvolqb`, voir `.env`). Le schéma est
appliqué et à jour : produits, commandes, stocks, paramètres, rôles admin,
stockage des photos produit.

## Appliquer une nouvelle migration

Chaque changement de schéma est un fichier SQL numéroté dans
`supabase/migrations/`. Pour l'appliquer :

```bash
supabase login
supabase link --project-ref lrwirmjzojvocgfvolqb
supabase db push
```

Ou, plus simple : colle le contenu du fichier dans le **SQL Editor** du
Dashboard Supabase et exécute-le.

## Créer un compte admin

Les migrations ne créent aucun utilisateur (Supabase Auth n'est pas gérable en
SQL simple). Depuis le Dashboard Supabase → **Authentication → Users → Add
user**, crée un compte avec un email et un mot de passe. Copie l'UUID généré,
puis dans le **SQL Editor** :

```sql
insert into public.user_roles (user_id, role)
values ('<uuid-de-l-utilisateur>', 'admin');
```

Sans cette ligne, personne n'est admin : toutes les écritures (produits,
stocks, commandes, paramètres) restent refusées par les policies RLS.

## Vérifier

```sql
select u.id, u.email, r.role
from auth.users u
join public.user_roles r on r.user_id = u.id;
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
| `20260920000008_product_images_storage.sql` | Bucket Storage `product-images` (public en lecture, écriture admin uniquement) pour l'upload réel des photos produit |
