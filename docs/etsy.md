# Intégration Etsy Open API v3 — Spécifications & Architecture de Production

## 1. Vue d'ensemble
L'intégration Etsy d'**EtsyPilot AI** utilise exclusivement l'API officielle **Etsy Open API v3** (REST / JSON) avec le protocole d'authentification **OAuth 2.0 PKCE** (Proof Key for Code Exchange, RFC 7636).

---

## 2. Flux OAuth 2.0 & Validation PKCE
```
UTILISATEUR
    │
    ▼
1. Clic [Connecter Boutique Etsy]
    │
    ▼
2. GET /api/etsy/auth/start
   ├─ Génération cryptographique code_verifier (32 octets aléatoires)
   ├─ Calcul code_challenge = Base64URL(SHA256(code_verifier))
   ├─ Génération state aléatoire (16 octets, TTL 10 minutes)
   └─ Construction de l'URL d'autorisation officielle
    │
    ▼
3. Redirection vers https://www.etsy.com/oauth/connect
   └─ Scopes demandés : shops_r listings_r listings_w listings_d transactions_r email_r
    │
    ▼
4. Autorisation accordée par le vendeur sur Etsy
    │
    ▼
5. Callback GET /api/etsy/auth/callback?code=...&state=...
   ├─ Vérification stricte du state
   ├─ Récupération du code_verifier associé
   ├─ POST https://api.etsy.com/v3/public/oauth/token (grant_type=authorization_code)
   ├─ Réception access_token & refresh_token
   ├─ Chiffrement symétrique AES-256-GCM
   └─ Initialisation du profil boutique et de la synchronisation
```

---

## 3. Scopes OAuth 2.0 Officiels & Justifications

| Scope Officiel | Rôle & Nécessité Métier | Endpoints API Associés |
| :--- | :--- | :--- |
| **`shops_r`** | Lecture des métadonnées de la boutique (nom, devise, statut, ventes). | `GET /v3/application/users/{user_id}/shops`<br>`GET /v3/application/shops/{shop_id}` |
| **`listings_r`** | Lecture de l'ensemble du catalogue et des images. | `GET /v3/application/shops/{shop_id}/listings`<br>`GET /v3/application/listings/{listing_id}` |
| **`listings_w`** | Création et modification des listings (titre, prix, stock, description, tags). | `PATCH /v3/application/shops/{shop_id}/listings/{listing_id}` |
| **`listings_d`** | **Obligatoire pour la suppression de listings**. (*`listings_w` ne permet pas de supprimer*). | `DELETE /v3/application/listings/{listing_id}` |
| **`transactions_r`** | Lecture des transactions de vente et reçus de commandes. | `GET /v3/application/shops/{shop_id}/receipts` |
| **`email_r`** | Identification du compte vendeur créateur. | Profil utilisateur Etsy |

---

## 4. Stratégie de Rate Limiting & Gestion des Erreurs

### Distinction QPS / QPD
* **QPS (Queries Per Second) :** Etsy applique une limite par défaut de **10 requêtes par seconde** par application (modifiable selon le tier approuvé).
* **QPD (Queries Per Day) :** Limite globale de **10 000 requêtes par jour** (en tier de base).
* **Throttler Interne :** Chaque requête sortante est espacée d'au minimum `110 ms` (`ETSY_REQUEST_INTERVAL_MS`), plafonnant le débit à ~9 req/sec pour éviter tout pic de charge.

### Gestion du HTTP 429 & Header `retry-after`
1. Réception d'un statut HTTP 429.
2. Lecture du header `retry-after` s'il est fourni par Etsy (en secondes).
3. Si absent : application d'un **Backoff Exponentiel avec gigue** ($\text{Délai} = 2^{\text{attempt}} \times 1000 + \text{jitter}$).
4. **Limite stricte de retries :** Maximum **3 tentatives** (`ETSY_MAX_RETRIES`) pour empêcher les tempêtes de requêtes (retry storms).
5. En cas d'échec définitif : journalisation dans `audit_logs` et affichage d'un message clair à l'utilisateur.

---

## 5. Pagination & Profondeur de Catalogue

* **Paramètres officiels :** `limit` (plafonné à **100** max par lot) et `offset`.
* **Protection boucle infinie :** Seuil de sécurité `maxOffsetSafety` (50 000) et arrêt immédiat dès que `allListings.length >= res.count` ou que le lot retourné est vide.

---

## 6. Cycle de Vie & Sécurité des Suppressions (DELETE LISTING)

* **Endpoint :** `DELETE /v3/application/listings/{listing_id}`
* **Scope vérifié :** `listings_d` (vérification préalable via `EtsyTokenService.hasScope`).
* **Réponse attendue :** `HTTP 204 No Content` ou `HTTP 200 OK`.
* **Règle absolue :** **Aucune suppression automatique**. Chaque suppression requiert obligatoirement l'affichage d'une modale de confirmation `ConfirmDialog` rappelant le titre du produit et l'irréversibilité de l'opération.

---

## 7. Sécurité & Chiffrement des Tokens

* **Algorithme :** AES-256-GCM (Chiffrement symétrique authentifié).
* **Clé :** Dérivation SHA-256 de 32 octets issue de `process.env.TOKEN_ENCRYPTION_KEY`.
* **Isolation :** Aucun jeton d'accès ou de rafraîchissement n'est jamais transmis au navigateur client ni consigné dans les logs.

---

## 8. Distinction : Tests Internes vs Connexion Réelle Etsy

* **Tests Internes :** Vérifient la validité des algorithmes (PKCE, AES-256-GCM, Diff Engine, Throttler, 429 parser, Scopes).
* **Connexion Réelle :** Nécessite que le vendeur renseigne ses clés `ETSY_CLIENT_ID` et `ETSY_CLIENT_SECRET` et termine l'authentification OAuth sur Etsy. En l'absence de clés réelles, le statut affiché reste fidèlement : `REAL ETSY CONNECTION: NOT TESTED`.
