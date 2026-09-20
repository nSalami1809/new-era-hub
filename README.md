# Cap Style Co.

MASTER PROMPT — E-COMMERCE DE CASQUETTES

1. OBJECTIF DU PROJET

Je veux créer un véritable site e-commerce professionnel dédié à la vente de casquettes.

Le projet doit être pensé comme une petite boutique en ligne réelle, avec :

Un site public destiné aux visiteurs/clients.

Un panier.

Un processus de commande simple.

La génération d'une facture/récapitulatif de commande.

Une redirection vers WhatsApp avec un message prérempli contenant automatiquement les informations de la commande.

Un back-office administrateur permettant de gérer entièrement le catalogue, les stocks, les ventes et les promotions.

L'objectif principal est de permettre à un client de :

consulter → rechercher → choisir → ajouter au panier → renseigner ses informations → générer sa facture → contacter le vendeur sur WhatsApp pour procéder au paiement.

Il ne faut PAS intégrer un paiement en ligne pour le moment.

Le paiement sera finalisé manuellement via WhatsApp.

2. CONTRAINTE DESIGN ABSOLUE

IMPORTANT :

NE PAS générer un design ressemblant aux sites générés automatiquement par les IA.

Je veux une interface qui ressemble à un véritable site e-commerce conçu par un designer UI/UX professionnel.

INTERDICTIONS :

Pas de glassmorphism.

Pas de gros effets de flou.

Pas de gradients décoratifs inutiles.

Pas de texte avec gradient.

Pas de glow.

Pas de néons.

Pas de formes organiques artificielles.

Pas de blobs.

Pas de grosses illustrations 3D inutiles.

Pas de cartes flottantes partout.

Pas de boutons excessivement arrondis.

Pas d'interface ressemblant à un dashboard SaaS générique.

Pas de design « AI generated landing page ».

Pas de sections avec énormément d'espace vide sans raison.

Pas d'animations excessives.

Pas de titres gigantesques occupant la moitié de l'écran.

Pas de composants décoratifs sans utilité fonctionnelle.

Pas de carrousels inutiles.

Pas de design surchargé.

Je veux un design :

sobre

moderne

commercial

élégant

rapide

professionnel

très lisible

orienté produit

orienté conversion

responsive

mobile-first

cohérent

Le site doit donner l'impression d'une vraie boutique e-commerce, pas d'une démonstration de design générée par une IA.

Privilégier une interface éditoriale et commerciale avec une excellente hiérarchie visuelle.

3. IDENTITÉ VISUELLE

Couleurs

Couleur principale du site :

Blanc : #FFFFFF

Texte principal : noir / #111111

Texte secondaire : gris foncé

Bordures : gris clair

Boutons

Bouton :

Ajouter au panier

Vert

texte blanc

Bouton :

Supprimer du panier

Rouge

texte blanc

Le vert doit être utilisé principalement pour les actions positives :

Ajouter au panier

Valider

Confirmer

Continuer

Le rouge doit être réservé aux actions destructives :

Supprimer

Retirer

Annuler une action destructive

Ne pas utiliser du rouge comme couleur décorative principale.

4. TYPOGRAPHIE

Utiliser la typographie :

Ranade

La typographie doit être utilisée de manière cohérente sur toute l'application.

Hiérarchie claire :

H1 : fort et lisible

H2 : clairement différencié

H3 : plus compact

texte courant : très lisible

prix : suffisamment visible

boutons : lisibles et professionnels

Éviter les textes trop fins.

5. STRUCTURE GÉNÉRALE

Créer deux espaces complètement distincts :

SITE PUBLIC

Routes principales :

/

/boutique

/produit/[id]

/panier

/commande

/facture/[id]

BACK-OFFICE

Routes :

/admin

/admin/produits

/admin/produits/nouveau

/admin/produits/[id]

/admin/commandes

/admin/promotions

/admin/stocks

/admin/parametres

Le back-office doit être protégé par authentification.

6. PAGE D'ACCUEIL

Créer une vraie page d'accueil e-commerce.

Elle doit contenir :

Header

À gauche :

Logo / nom de la boutique.

Au centre ou à proximité :

Boutique

Promotions

éventuellement Nouveautés

À droite :

Recherche

Panier

accès administrateur uniquement si approprié

Le header doit rester simple.

Pas de navbar gigantesque.

Section principale

Présenter clairement la boutique et les produits.

Exemple de message :

Des casquettes pensées pour votre style.

Avec un bouton :

Voir la boutique

Ne pas créer une énorme hero section artificielle.

La priorité doit rester les produits.

Produits

Afficher les produits sous forme de grille e-commerce.

Chaque produit doit afficher :

image

marque

nom

prix

ancien prix si promotion

pourcentage de réduction si applicable

disponibilité

bouton Ajouter au panier

Exemple :

IMAGE

NIKE
Nike Club Cap

25 000 FCFA

20 000 FCFA

-20%

[ Ajouter au panier ]

7. BOUTIQUE / CATALOGUE

Créer une page /boutique.

Elle doit afficher tous les produits disponibles.

Ajouter une barre de recherche très visible.

Placeholder :

Rechercher une casquette, une marque...

La recherche doit permettre de rechercher par :

nom

marque

référence éventuellement

Ajouter éventuellement des filtres :

marque

prix

disponibilité

promotions

Prévoir un tri :

Plus récents

Prix croissant

Prix décroissant

Nom A-Z

La grille doit être parfaitement responsive.

Desktop :
plusieurs colonnes.

Tablette :
moins de colonnes.

Mobile :
2 colonnes si la largeur le permet, sinon 1 colonne.

8. FICHE PRODUIT

Créer une vraie page produit.

Elle doit contenir :

grande image principale

images secondaires si disponibles

marque

nom

description

prix

ancien prix si promotion

réduction

stock disponible

référence

bouton Ajouter au panier

Si le stock est à 0 :

Afficher clairement :

Rupture de stock

Et désactiver le bouton Ajouter au panier.

Si le produit est en promotion :

Afficher clairement le prix promotionnel.

Exemple :

25 000 FCFA

20 000 FCFA

-20%

9. PANIER

Créer une vraie page panier.

Afficher chaque article avec :

image

marque

nom

prix unitaire

quantité

sous-total

bouton supprimer

Permettre d'augmenter/diminuer la quantité.

La quantité ne doit jamais pouvoir dépasser le stock disponible.

Afficher :

Résumé

Sous-total
Réduction
Total

Le total doit être calculé automatiquement.

Bouton principal :

Passer la commande

Si le panier est vide :

Afficher une interface claire :

Votre panier est vide.

Avec :

Continuer mes achats

10. PROCESSUS DE COMMANDE

Après avoir cliqué sur :

Passer la commande

Afficher un formulaire client.

Champs obligatoires :

Informations client

Nom

Prénom

Numéro de téléphone

Lieu de livraison

Prévoir également éventuellement :

adresse détaillée

commentaire / précision de livraison

Le téléphone doit être correctement validé.

Le formulaire doit être simple et rapide.

Ne pas demander inutilement des informations personnelles.

11. FACTURE / RÉCAPITULATIF

Après validation du formulaire, générer une facture / un récapitulatif de commande.

La facture doit contenir :

Informations boutique

Nom de la boutique

éventuellement logo

coordonnées

Informations client

Nom

Prénom

Téléphone

Lieu de livraison

Articles

Pour chaque article :

image miniature

marque

nom

quantité

prix unitaire

sous-total

Totaux

Sous-total

réduction éventuelle

total final

Informations commande

numéro de commande unique

date

statut

Exemple :

Commande #CMD-2026-0001

12. WHATSAPP

Sous la facture, créer un bouton très visible :

Procéder au paiement sur WhatsApp

Le bouton doit rediriger vers WhatsApp.

Le numéro WhatsApp doit être configurable depuis le back-office.

NE PAS coder définitivement le numéro directement dans plusieurs composants.

Créer une configuration centralisée de la boutique.

13. MESSAGE WHATSAPP AUTOMATIQUE

Le bouton WhatsApp doit générer automatiquement un message contenant toutes les informations utiles.

Format souhaité :

Bonjour, je souhaite procéder au paiement de ma commande.

Commande : #CMD-2026-0001

Client :
Nom : [NOM]
Prénom : [PRÉNOM]
Téléphone : [TÉLÉPHONE]
Lieu de livraison : [ADRESSE]

Articles :

[MARQUE] [NOM DU PRODUIT] x [QUANTITÉ] — [PRIX]

[MARQUE] [NOM DU PRODUIT] x [QUANTITÉ] — [PRIX]

Total : [TOTAL] FCFA

J'aimerais procéder au paiement.

Merci.

Le message doit être généré dynamiquement.

Encoder correctement le message pour l'URL WhatsApp.

Utiliser le format WhatsApp approprié :

https://wa.me/[NUMERO]?text=[MESSAGE_ENCODE]

Le numéro doit provenir de la configuration du magasin.

14. IMAGE DES ARTICLES DANS WHATSAPP

IMPORTANT :

L'URL WhatsApp ne permet pas d'envoyer automatiquement les images des produits comme pièces jointes simplement via le paramètre text.

Donc :

inclure dans le message le nom des produits

inclure les informations de commande

prévoir éventuellement une référence produit

ne pas prétendre que les images sont réellement jointes automatiquement

Sur la facture, les images des articles doivent cependant être visibles.

Si une solution technique permettant de partager les images existe dans le futur, elle pourra être ajoutée séparément.

15. STOCKS

Le stock doit être géré dynamiquement.

Chaque produit doit avoir :

stock actuel

seuil d'alerte éventuellement

quantité vendue

statut

Exemples :

En stock

Stock faible

Rupture de stock

Lorsqu'une commande est créée :

les quantités doivent être réservées/déduites selon la logique choisie.

Éviter les ventes supérieures au stock disponible.

Prévoir une protection contre deux commandes simultanées qui essaieraient de vendre le dernier article.

16. BACK-OFFICE

Créer un véritable tableau de bord administrateur.

Il doit être fonctionnel et non simplement visuel.

Dashboard :

nombre de produits

produits en stock

produits en rupture

commandes

chiffre d'affaires

produits en promotion

produits les plus vendus

Ne pas transformer le dashboard en interface SaaS complexe.

Priorité à la lisibilité.

17. GESTION DES PRODUITS

Dans :

/admin/produits

Afficher une liste/table des produits.

Colonnes :

Image

Produit

Marque

Prix

Prix promotionnel

Stock

Statut

Actions

Actions :

Modifier

Supprimer

Mettre en promotion

Retirer de la promotion

Ajuster le stock

18. AJOUT D'UN PRODUIT

Créer un formulaire :

Nom

Marque

Description

Prix

Prix promotionnel

Stock

Référence

Image principale

Images secondaires

Statut

Le système doit permettre de créer rapidement un nouveau produit.

19. MODIFICATION D'UN PRODUIT

L'administrateur doit pouvoir modifier :

nom

marque

description

prix

promotion

stock

images

référence

statut

Les changements doivent être immédiatement reflétés sur le site public.

20. SUPPRESSION

Ajouter une confirmation avant suppression.

Exemple :

Supprimer ce produit ?

Cette action est irréversible.

Boutons :

[ Annuler ]

[ Supprimer ]

Le bouton Supprimer doit être rouge.

21. PROMOTIONS

Créer une gestion simple des promotions.

L'administrateur peut :

activer une promotion

désactiver une promotion

définir un prix promotionnel

éventuellement définir une réduction en pourcentage

Exemple :

Prix normal :
25 000 FCFA

Prix promotionnel :
20 000 FCFA

Le site affiche automatiquement :

25 000 FCFA

20 000 FCFA

-20%

Le calcul du pourcentage doit être automatique.

22. GESTION DES STOCKS

Créer une interface dédiée :

/admin/stocks

L'administrateur peut :

voir tous les stocks

rechercher un produit

augmenter le stock

diminuer le stock

définir directement une nouvelle quantité

Exemple :

Nike Club Cap

Stock actuel : 12

[ - ] [ 12 ] [ + ]

Ou :

Ajuster le stock

Nouvelle quantité : [ 25 ]

[ Enregistrer ]

Conserver idéalement un historique des mouvements de stock :

date

produit

ancienne quantité

nouvelle quantité

différence

raison

administrateur

23. COMMANDES

Créer :

/admin/commandes

Afficher les commandes.

Pour chaque commande :

numéro

date

client

téléphone

lieu de livraison

produits

montant

statut

Statuts :

Nouvelle

Contacté

Paiement en attente

Payée

En préparation

Expédiée

Livrée

Annulée

L'administrateur doit pouvoir modifier le statut.

24. DÉTAIL D'UNE COMMANDE

Créer une page détaillée.

Afficher :

Client

Nom :
Prénom :
Téléphone :
Lieu de livraison :

Commande :

produits + quantités + prix.

Total.

Historique des statuts.

Permettre à l'administrateur de modifier le statut.

25. PARAMÈTRES DE LA BOUTIQUE

Créer :

/admin/parametres

Paramètres :

nom de la boutique

logo

numéro WhatsApp

devise

informations de contact

adresse

éventuellement réseaux sociaux

Le numéro WhatsApp doit être modifiable sans modifier le code.

26. BASE DE DONNÉES

Prévoir une architecture de données propre.

Entités minimales :

Product

id

name

brand

description

price

promotionalPrice

stock

sku

images

isActive

isFeatured

createdAt

updatedAt

Order

id

orderNumber

customer

items

subtotal

discount

total

status

createdAt

updatedAt

Customer

firstName

lastName

phone

deliveryLocation

StockMovement

productId

previousStock

newStock

difference

reason

createdAt

adminId

StoreSettings

storeName

logo

whatsappNumber

currency

contactInformation

27. ARCHITECTURE TECHNIQUE

Construire l'application avec une architecture propre et maintenable.

Privilégier :

TypeScript

React

composants réutilisables

séparation claire frontend/backend

validation des données

gestion correcte des erreurs

états de chargement

états vides

états d'erreur

responsive design

Si une base de données est nécessaire, utiliser une vraie persistance des données.

Ne pas construire un faux back-office avec uniquement des données statiques.

28. RESPONSIVE

Le site doit être excellent sur :

smartphone

tablette

ordinateur portable

desktop

Priorité au mobile car beaucoup de clients consulteront probablement la boutique depuis leur téléphone.

Le panier et le processus de commande doivent être particulièrement optimisés pour mobile.

29. ACCESSIBILITÉ

Prévoir :

contraste suffisant

boutons suffisamment grands sur mobile

labels explicites

navigation clavier correcte

alt text des images

messages d'erreur compréhensibles

focus visible

30. PERFORMANCE

Le site doit être rapide.

Optimiser :

images

chargement des produits

recherche

panier

pages publiques

back-office

Éviter les bibliothèques inutiles.

Ne pas ajouter des animations qui ralentissent le site.

31. SEO

Prévoir :

title

meta description

Open Graph

URLs propres

sitemap

robots.txt

données structurées produit si pertinent

Chaque fiche produit doit pouvoir avoir un titre et une description adaptés.

32. UX

L'utilisateur doit toujours savoir :

où il se trouve

ce qu'il a ajouté au panier

combien coûte sa commande

ce qu'il doit faire ensuite

Après ajout au panier :

Afficher une confirmation discrète.

Exemple :

Produit ajouté au panier.

Ne pas utiliser de popup agressive.

Le panier doit afficher clairement le nombre d'articles.

33. GESTION DES ERREURS

Prévoir des messages explicites.

Exemples :

Stock insuffisant :

Désolé, il ne reste que 2 exemplaires de ce produit.

Produit indisponible :

Ce produit n'est plus disponible.

Erreur serveur :

Une erreur est survenue. Veuillez réessayer.

Formulaire invalide :

Afficher l'erreur directement sous le champ concerné.

34. SÉCURITÉ

Le back-office doit être protégé.

Ne jamais faire confiance aux données envoyées par le navigateur.

Valider les prix, quantités et produits côté serveur.

Empêcher :

modification arbitraire du prix

quantité négative

commande avec stock inexistant

accès public aux fonctions administratives

suppression non autorisée

Les données administratives ne doivent jamais être exposées inutilement au frontend public.

35. DESIGN DES COMPOSANTS

Les composants doivent être cohérents.

Utiliser principalement :

rectangles

coins légèrement arrondis si nécessaire

bordures fines

ombres très discrètes

beaucoup de lisibilité

Éviter les composants excessivement arrondis.

Les boutons doivent avoir une apparence professionnelle.

Exemple :

[ Ajouter au panier ]

et non :

[ ✨ Ajouter au panier → ]

Éviter les emojis dans l'interface sauf s'ils ont une vraie utilité.

36. ICÔNES

Utiliser une bibliothèque d'icônes cohérente.

Les icônes doivent être discrètes et fonctionnelles.

Ne pas remplacer les textes importants par des icônes seules.

Exemples :

recherche

panier

suppression

modification

stock

commande

paramètres

37. ANIMATIONS

Animations très légères uniquement lorsque cela améliore l'expérience :

hover

ajout au panier

changement de page

feedback d'action

Pas de :

scroll animation excessive

parallaxe

éléments flottants

animation permanente

effets 3D inutiles

38. IMPORTANT — PRODUIT RÉEL, PAS MAQUETTE

Je veux une application réellement fonctionnelle.

NE PAS simplement créer une maquette visuelle.

Toutes les fonctions principales doivent fonctionner :

recherche

catalogue

fiche produit

panier

modification des quantités

formulaire client

génération de commande

génération du récapitulatif/facture

génération du message WhatsApp

gestion des produits

gestion des stocks

promotions

commandes

authentification administrateur

paramètres

39. DONNÉES DE DÉMONSTRATION

Créer quelques produits de démonstration réalistes afin de pouvoir tester immédiatement l'application.

Utiliser des noms de marques et produits clairement identifiables comme données de démonstration.

Prévoir suffisamment de produits pour tester :

recherche

promotions

stock faible

rupture de stock

panier avec plusieurs articles

40. AVANT DE CODER

Avant de générer l'application complète :

Comprendre toute l'architecture.

Définir les modèles de données.

Définir les routes.

Définir les composants principaux.

Définir le parcours utilisateur.

Définir le fonctionnement du back-office.

Vérifier la logique du stock.

Vérifier la génération de commande.

Vérifier la génération du message WhatsApp.

Ensuite seulement commencer l'implémentation.

41. PRIORITÉ ABSOLUE

L'ordre des priorités est :

Fonctionnalité

Fiabilité

UX

Performance

Responsive

Design

Je préfère une interface sobre mais parfaitement fonctionnelle plutôt qu'une interface spectaculaire mais fragile.

42. CRITÈRE FINAL

À la fin, je dois pouvoir faire exactement ceci :

VISITEUR :

Accueil
↓
Boutique
↓
Recherche d'une casquette
↓
Ouverture du produit
↓
Ajouter au panier
↓
Panier
↓
Passer la commande
↓
Nom
Prénom
Téléphone
Lieu de livraison
↓
Validation
↓
Facture / récapitulatif
↓
Bouton WhatsApp
↓
WhatsApp s'ouvre avec le message automatiquement rempli
↓
« J'aimerais procéder au paiement. »

ADMIN :

Connexion
↓
Dashboard
↓
Produits
↓
Ajouter / modifier / supprimer
↓
Stocks
↓
Ajuster les quantités
↓
Promotions
↓
Commandes
↓
Modifier les statuts
↓
Paramètres
↓
Modifier le numéro WhatsApp et les informations de la boutique

CONSIGNE FINALE À RESPECTER

Ne cherche pas à impressionner avec un design « AI startup ».

Je veux une boutique e-commerce crédible, simple, professionnelle et directement exploitable.

Le design doit être principalement :

BLANC + NOIR + VERT + ROUGE

avec la typographie :

RANADE

L'interface doit être suffisamment sobre pour que les casquettes soient le centre de l'attention.

Le résultat final doit ressembler à un véritable commerce en ligne construit sur mesure, et non à un template généré par une IA.

Avant de terminer, vérifie le parcours complet client et le parcours complet administrateur et corrige les bugs fonctionnels, les problèmes responsive et les incohérences UX.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/27b05fe7-633e-48ce-9572-5761ae66fbc2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
