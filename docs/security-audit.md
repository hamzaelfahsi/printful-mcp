# ETSYPILOT AI — SECURITY AUDIT & THREAT MODEL (PHASE 9)

## 1. EXECUTIVE SUMMARY

Cette revue de sécurité formalise l'audit approfondi de l'application SaaS EtsyPilot AI, couvrant l'ensemble des vecteurs OWASP Top 10, la protection cryptographique des secrets, la défense contre l'injection de prompt et la sécurité des intégrations tierces (Etsy, Pinterest, réseaux d'affiliation).

---

## 2. SECURITY THREAT MATRIX

| Catégorie de Menace | Risque Évalué | Preuve & Zone Auditée | Statut | Atténuation Appliquée |
|---|---|---|---|---|
| **Authentification & Sessions** | Élevé | Middleware Express, cookies OAuth | **CONFORME** | Cookies SameSite/HttpOnly, rejet 401/403 systématique sur routes non autorisées. |
| **Autorisation & IDOR** | Critique | Isolation des boutiques et campagnes | **CONFORME** | Clé `user_id` obligatoire et vérification de périmètre (`validateResourceAccess`). |
| **Sécurité OAuth 2.0 (PKCE)** | Critique | Échanges Etsy & Pinterest | **CONFORME** | State CSRF aléatoire, Code Verifier SHA-256, chiffrement des tokens en AES-256-GCM. |
| **CSRF** | Moyen | Endpoints de mutation | **CONFORME** | Validation stricte du paramètre `state` et des en-têtes d'origine. |
| **XSS (Cross-Site Scripting)** | Moyen | Titres Etsy, descriptions Pins | **CONFORME** | Échappement natif React, désinfection systématique des entrées textuelles. |
| **Injection SQL** | Critique | Schéma SQL & requêtes paramétrées | **CONFORME** | Requêtes paramétrées, aucune concaténation brute de chaîne SQL. |
| **Injection de Formules CSV** | Élevé | Import rapports d'affiliation | **CONFORME** | Neutralisation systématique des préfixes `=, +, -, @, \t, \r` par apostrophe. |
| **SSRF (Server-Side Request Forgery)** | Élevé | Liens de redirection de tracking | **CONFORME** | Whitelist stricte de domaines autorisés (`etsy.com`, `pinterest.com`, `craftcases.studio`). |
| **Redirections Ouvertes (Open Redirect)** | Moyen | Route `/t/:code` et `/track/:code` | **CONFORME** | Validation formelle du domaine cible avant émission du code HTTP 302. |
| **Injection de Prompt (LLM)** | Élevé | Génération Gemini & Insights | **CONFORME** | Données utilisateurs injectées comme chaînes littérales isolées, interdiction de directives d'exécution. |
| **Fuite de Secrets / Tokens** | Critique | Logs système & bundle frontend | **CONFORME** | Filtres d'assainissement dans `NotificationService` et `AuditService`, aucun secret dans le bundle React. |
| **Abus d'API & Boucles de Requêtes** | Moyen | Endpoints IA et planificateur | **CONFORME** | Limiteur de débit (`rateLimiter`) et plafond journalier (`AI_ANALYSIS_DAILY_LIMIT = 50`). |
| **Sécurité du Planificateur (Approval Gate)** | Critique | Publication Etsy & Pinterest | **CONFORME** | Phase 5 Approval Gate infranchissable : transition obligatoire `DRAFT → APPROVED → PUBLISHED`. |
| **Zero-PII & Confidentialité** | Moyen | Analytics & tracking de clics | **CONFORME** | Hachage SHA-256 irréversible des adresses IP et user-agents, aucune donnée nominative stockée. |

---

## 3. CRYPTOGRAPHIC STORAGE AUDIT

Les jetons d'accès et de rafraîchissement Etsy et Pinterest sont protégés au repos :
* **Algorithme** : AES-256-GCM (Galois/Counter Mode).
* **Vecteur d'Initialisation (IV)** : 16 octets aléatoires générés à chaque chiffrement.
* **Tag d'Authentification** : 16 octets validés lors du déchiffrement pour empêcher toute altération.

---

## 4. AUDIT DU BUNDLE FRONTEND

L'inspection des assets compilés (`dist/`) confirme l'absence absolue de :
* Clés d'API Gemini (`GEMINI_API_KEY`)
* Secrets d'application Etsy (`ETSY_CLIENT_SECRET`)
* Secrets d'application Pinterest (`PINTEREST_APP_SECRET`)
* Chaînes de connexion aux bases de données.

---

## 5. RECOMMANDATIONS & LIMITES CONNUES

1. **Environnement de Prévisualisation** : En mode développement / sandbox, les appels d'écriture réels vers Pinterest et Etsy sont protégés par le mode contrôlé `CONTROLLED_PUBLICATION_TEST`.
2. **Sauvegardes & Restauration** : La politique de sauvegarde automatisée managée de la base de données sera consolidée dans l'infrastructure de déploiement Cloud (Phase 10).
