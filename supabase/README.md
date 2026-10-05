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

| Fichier                                     | Contenu                                                                                                                                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260920000001_extensions_and_helpers.sql` | Extension `pgcrypto`, enum `order_status`, trigger générique `updated_at`                                                                                                                                                                             |
| `20260920000002_products.sql`               | Table `products`                                                                                                                                                                                                                                      |
| `20260920000003_store_settings.sql`         | Table `store_settings` (ligne unique)                                                                                                                                                                                                                 |
| `20260920000004_orders.sql`                 | `orders`, `order_items`, `order_status_history` + trigger de traçabilité automatique des statuts                                                                                                                                                      |
| `20260920000005_stock_movements.sql`        | Historique des mouvements de stock                                                                                                                                                                                                                    |
| `20260920000006_roles_and_rls.sql`          | `user_roles`, fonction `is_admin()`, activation RLS + policies sur toutes les tables                                                                                                                                                                  |
| `20260920000007_order_functions.sql`        | `create_order()` (seul chemin de création de commande, prix/stock revérifiés serveur), `get_order_receipt()` (lecture facture invité par id), `adjust_stock()` (ajustement stock admin tracé)                                                         |
| `20260920000008_product_images_storage.sql` | Bucket Storage `product-images` (public en lecture, écriture admin uniquement) pour l'upload réel des photos produit                                                                                                                                  |
| `20260921000007_product_colors.sql`         | Table `product_colors` (nom, teinte, photos par couleur), `product_variants.color_id` (taille et/ou couleur), `order_items.variant_color`, fonctions couleur (`add/update/remove_product_color`) et mise à jour de `create_order`/`get_order_receipt` |
| `20260923000001_expenses.sql`               | Table `expenses` (dépenses/charges hors marchandises), admin-only                                                                                                                                                                                    |
| `20260923000002_notifications.sql`          | `store_settings.low_margin_threshold`, activation Realtime sur `orders` pour les alertes admin in-app                                                                                                                                                |
| `20261004000001_offline_sales.sql`          | `orders.channel` (`'site' \| 'offline'`), fonction `create_offline_sale()` (vente hors site admin-only : décrémente le stock, incrémente `sold`, statut direct `'Payée'`, pas de paiement)                                                          |
| `20261004000002_product_track_by_size.sql`  | `products.track_by_size` (défaut `true`) — surcharge par produit du suivi par taille, pour un produit d'une catégorie "taille" géré en stock par couleur uniquement (ex : un T-shirt vendu sans distinction de taille)                              |
| `20261004000003_category_visibility.sql`    | `product_categories.is_visible` (défaut `true`) — masque une catégorie des filtres/vitrines du site public sans toucher aux produits qu'elle contient. Renommer une catégorie ne nécessite aucune migration : `products.category` est déjà en `on update cascade` sur `product_categories.name`                                                                                             |
| `20261005000001_order_access_token.sql`     | Corrige une fuite de PII : `get_order_receipt` matchait aussi `order_number` (ex. `CMD-2026-0001`, strictement séquentiel), permettant d'énumérer toutes les commandes en incrémentant le suffixe. `orders.access_token` (secret public, 128 bits, distinct de `id` et `order_number`) devient l'unique moyen de lire une facture ; `create_order` renvoie désormais aussi ce token. Nouvelle fonction `get_order_receipt_by_number(order_number, phone)` dédiée au formulaire "Suivre ma commande" (saisie manuelle), qui exige le téléphone de la commande et ne renvoie jamais le contenu directement — seulement le token |
| `20261005000002_product_pagination_support.sql` | Support de la pagination serveur (ID-2) : `products.available_sizes text[]` (dénormalisé, synchronisé par trigger depuis `product_variants`, même pattern que `sync_product_stock_from_variants`) pour le filtre taille de la boutique ; `products.effective_price`/`has_promo` (colonnes générées, reproduisent exactement `effectivePrice()` côté serveur) pour le tri prix et le filtre promo ; `orders.customer_full_name` (générée) pour que la recherche admin "prénom nom" combinée fonctionne côté serveur ; index `products(created_at desc)` (tri par défaut de la boutique, absent jusqu'ici) |
| `20261005000003_order_idempotency.sql`      | Idempotence de `create_order` (ID-4) : nouvelle table `order_idempotency_keys` (clé → empreinte SHA-256 des paramètres normalisés, calculée côté serveur, + résultat de la commande). `p_idempotency_key` devient un paramètre de `create_order` (désormais requis en pratique, validé explicitement) ; même clé + mêmes paramètres → renvoie la commande déjà créée sans la recréer ; même clé + paramètres différents → refusé ; concurrence gérée par la contrainte unique de la table (Postgres bloque un insert concurrent en conflit jusqu'à ce que l'autre transaction committe), pas de verrou applicatif. Contient `#variable_conflict use_column` : `order_id`/`order_number`/`access_token` sont à la fois des paramètres `OUT` de la fonction et des colonnes réelles, ambigu sans ce pragma (bug latent depuis `20261005000001`, jamais déclenché faute d'un test de bout en bout réussi jusqu'ici) |
