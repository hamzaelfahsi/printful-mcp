# Moteur de Programmation & Publication — Spécifications Techniques (Phase 5)

## 1. Vue d'ensemble
Le **Moteur de Programmation & Publication** d'EtsyPilot AI orchestre la diffusion multi-plateformes (Etsy et Pinterest Business API v5) avec des garanties strictes de validation humaine, d'idempotence, de gestion des pannes et de résilience réseau.

---

## 2. Machine à États Officielle

```
[ DRAFT ]
    │
    ▼
[ GENERATED ]
    │
    ▼
[ REVIEW ] (Revue et comparaison de versions)
    │
    ▼
[ APPROVED ] ── (Garde-fou humain obligatoire via ConfirmDialog)
    │
    ├──▶ [ SCHEDULED ] ──▶ [ PUBLISHING ] ──▶ [ PUBLISHED ]
    │                            │
    │                            ├── (Erreur 429 / 5xx / Timeout) ──▶ [ RETRY BACKOFF ] ──▶ [ SCHEDULED ]
    │                            │
    │                            └── (Erreur 400 / 403 / 404 / Non-Retryable) ──▶ [ FAILED ]
    │
    └──▶ [ PUBLISH NOW ] ──▶ [ PUBLISHING ] ──▶ [ PUBLISHED ]
```
*Toute tâche FAILED ne peut jamais être marquée PUBLISHED sans une résolution explicite.*

---

## 3. Idempotence & Prévention des Doublons

* **Clé d'Idempotence (`idempotencyKey`) :** Générée selon le format `idemp_{platform}_{contentId}_{versionId}_{timestamp}`.
* **Vérification d'existence préalable :** Avant toute publication, le worker vérifie si `externalId` existe déjà ou si une tâche identique est déjà dans l'état `PUBLISHING` ou `PUBLISHED`.
* **Verrou d'Exécution (`processingLocks`) :** Mutex en mémoire et transition d'état atomique empêchant l'exécution simultanée d'une même tâche par deux workers concurrents.

---

## 4. Politique de Retries & Classification des Erreurs

| Catégorie | Types d'Erreurs | Comportement du Worker |
| :--- | :--- | :--- |
| **RETRYABLE** | HTTP 429 (Rate Limit), Erreurs 5xx (500, 502, 503), Timeouts réseau | Application d'un **Backoff Exponentiel avec gigue** ($\text{délai} = 2^{\text{attempt}} \times 30\text{s} + \text{jitter}$) jusqu'à 3 tentatives max (`maxAttempts`). |
| **NON-RETRYABLE** | HTTP 400 (Requête invalide), 401 (Refresh token échoué), 403 (Scope manquant), 404 (Ressource introuvable), Payload incomplet | Transition immédiate à l'état **`FAILED`** avec notification d'alerte à l'utilisateur. |

---

## 5. Gestion des Fuseaux Horaires (Timezone)

* **Stockage en Base :** 100% en **UTC** au format standard ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* **Affichage Utilisateur :** Conversion dynamique dans le fuseau horaire local du navigateur avec indication claire des heures d'échéance.
* **Gestion du DST (Heure d'été/hiver) :** L'utilisation stricte des timestamps UTC élimine tout risque de décalage ou de double exécution lors des changements d'heure.

---

## 6. Système de Notifications & Journaux d'Audit

* **Événements notifiés :** `PUBLICATION_SCHEDULED`, `PUBLICATION_STARTED`, `PUBLICATION_SUCCESS`, `PUBLICATION_FAILED`, `RETRY_SCHEDULED`, `ACCOUNT_DISCONNECTED`, `TOKEN_EXPIRED`.
* **Sécurité Absolue :** Le service de notification et les journaux d'audit purgent automatiquement tout jeton d'accès ou secret d'authentification avant enregistrement.
