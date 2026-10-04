# Intégration Pinterest Business API v5 — Spécifications & Architecture de Production

## 1. Vue d'ensemble
L'intégration Pinterest d'**EtsyPilot AI** utilise l'API officielle **Pinterest Business API v5** (REST / JSON) via OAuth 2.0.

---

## 2. Table Officielle des Scopes OAuth 2.0 (Strictement Nécessaires)

| Scope | Fonction | Statut | Justification / Endpoints |
| :--- | :--- | :---: | :--- |
| **`user_accounts:read`** | Lecture des informations du profil créateur / business. | **OBLIGATOIRE** | `GET /v5/user_account` |
| **`boards:read`** | Lecture des tableaux et sections d'épingles. | **OBLIGATOIRE** | `GET /v5/boards` |
| **`boards:write`** | Création et édition de tableaux thématiques. | **OBLIGATOIRE** | Organisation des boards |
| **`pins:read`** | Lecture des épingles et métriques d'engagement organiques. | **OBLIGATOIRE** | `GET /v5/pins`, `GET /v5/pins/{pin_id}/analytics` |
| **`pins:write`** | Création (`POST /v5/pins`), mise à jour et suppression d'épingles. | **OBLIGATOIRE** | `POST/PATCH/DELETE /v5/pins` |
| **`ads:read`** | Gestion de campagnes publicitaires sponsorisées. | **NON UTILISÉ** | *Supprimé car EtsyPilot AI gère exclusivement le trafic organique boutique.* |

---

## 3. Endpoints API v5 & Analytics Organiques

### Endpoint d'Analytics : `GET /v5/pins/{pin_id}/analytics`
* **Méthode :** `GET`
* **Scope requis :** `pins:read`
* **Paramètres de requête :**
  - `start_date` : Date de début (format ISO `YYYY-MM-DD`).
  - `end_date` : Date de fin (format ISO `YYYY-MM-DD`).
  - `metric_types` : `IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE`.
* **Période maximale documentée :** 90 jours glissants.
* **Métriques calculées & retournées :**
  - `IMPRESSION` : Nombre d'affichages dans les flux Pinterest.
  - `PIN_CLICK` : Clics pour agrandir l'épingle.
  - `OUTBOUND_CLICK` : Clics sortants redirigeant vers la boutique Etsy.
  - `SAVE` : Épingles enregistrées dans les tableaux utilisateurs.
  - `CTR` : Taux de conversion sortant calculated $= (\text{OUTBOUND\_CLICK} / \text{IMPRESSION}) \times 100$.

---

## 4. Architecture de Programmation (Scheduling)

> ⚠️ **Limitation Officielle Pinterest API v5 :** Pinterest ne fournit aucun endpoint de programmation différée native pour les épingles organiques standards.
> **Statut :** `Pinterest scheduling = NOT_NATIVE`

### Solution d'Orchestration Interne EtsyPilot AI :
```
Contenu IA / Manuel
    │
    ▼
1. Création état DRAFT
    │
    ▼
2. Validation & Passage à l'état READY
    │
    ▼
3. APPROBATION HUMAINE EXPLICITE (État APPROVED)
    │
    ▼
4. Inscription dans scheduled_posts (idempotency_key, scheduled_at)
    │
    ▼
5. Worker en arrière-plan (Interroge les publications APPROVED échues)
    │
    ▼
6. Vérification du token d'accès (Rafraîchissement automatique si expiré)
    │
    ▼
7. Appel officiel POST /v5/pins
    │
    ▼
8. Récupération de l'identifiant distant (Pin ID) -> État PUBLISHED
    │
    ▼
9. Journalisation immuable dans audit_logs
```
*Toute publication reste strictement bloquée tant que l'utilisateur n'a pas validé l'état `APPROVED`.*

---

## 5. Gestion des Rate Limits & Headers API

* **Headers lus :**
  - `x-ratelimit-limit` : Limite de requêtes autorisées sur la fenêtre.
  - `x-ratelimit-remaining` : Requêtes restantes.
  - `x-ratelimit-reset` : Timestamp Unix de réinitialisation du quota.
  - `retry-after` : Délai d'attente imposé lors d'un code HTTP 429.
* **Throttler Adaptatif :** Espacement minimal configurable (`PINTEREST_REQUEST_INTERVAL_MS = 120ms`).
* **Stratégie de Repli :** Backoff exponentiel avec gigue ($\text{délai} = 2^{\text{attempt}} \times 1000 + \text{jitter}$), plafonné à 3 tentatives maximum.

---

## 6. Niveaux d'Accès Pinterest : Trial / Sandbox vs Standard / Production

| Caractéristique | Trial Access (Sandbox / Développement) | Standard Access (Production) |
| :--- | :--- | :--- |
| **Utilisateurs autorisés** | Limité aux développeurs / testeurs ajoutés manuellement dans le portail développeur Pinterest. | Tout utilisateur ou compte Pinterest Business public. |
| **Visibilité des publications** | Épingles visibles uniquement par les comptes de test ou sur des tableaux secrets / sandbox. | Épingles 100% publiques visibles par l'ensemble des millions d'utilisateurs Pinterest. |
| **Limites de requêtes (QPS)** | Plafond réduit (~10 req/s, ~1 000 requêtes / jour). | Quotas de production élevés validés lors de l'App Review. |
| **Statut de validation** | Les tests exécutés en sandbox **ne prouvent pas** une publication publique sans l'accord de production de Pinterest. | Nécessite la soumission de l'application à l'App Review Pinterest. |

---

## 7. Sécurité des Tokens & Confidentialité
* Chiffrement symétrique **AES-256-GCM** avec vecteur d'initialisation unique (IV 12 octets) et Auth Tag (16 octets).
* Zéro token transmis au frontend ni consigné dans les logs serveur.
