# ETSYPILOT AI — DOCUMENTATION COMPLÈTE DU SYSTÈME (PHASES 1–10)

## 1. APERÇU DU PROJET

EtsyPilot AI est une plateforme SaaS complète permettant d'optimiser le trafic, le référencement et la monétisation des boutiques Etsy grâce à Pinterest et à l'intelligence artificielle Gemini.

---

## 2. SYNTHÈSE DES PHASES D'INGÉNIERIE

* **Phase 1 : Intégration Etsy & Sync Engine** — Authentification OAuth 2.0 PKCE, synchronisation des fiches produits et calcul de diff sans écrasement aveugle.
* **Phase 2 : Intégration Pinterest & Épingles** — Gestion des tableaux, épingles et rafraîchissement automatique des jetons d'accès.
* **Phase 3 : Moteur d'IA & Générateur de Contenu** — Prompts optimisés pour des illustrations 2D plates Art Nouveau / vitrail pour coques de téléphones, sans mockups ni 3D.
* **Phase 4 : Versionnage & Mots-Clés** — Arbre de versions des contenus et suivi de la fréquence des tags.
* **Phase 5 : Planificateur & Publication Sécurisée** — Approval Gate humain obligatoire, verrouillage anti-course et détection d'idempotence SHA-256.
* **Phase 6 : Analytics & Attribution Multi-Touch** — Données certifiées `API_VERIFIED`, redirection first-party `/t/:code` et Zero-PII.
* **Phase 7 : Monétisation & Affiliation** — Centre d'importation officiel CSV/JSON, étanchéité financière stricte (Clics ≠ Ventes ≠ Commissions).
* **Phase 8 : Diagnostics & Recommandations IA** — Moteur d'insights explicables (Quoi/Pourquoi/Données/Test) avec validateur d'allégations `AIClaimValidator` et laboratoire A/B.
* **Phase 9 : Durcissement & Sécurité** — En-têtes OWASP, limiteur de débit, protection IDOR/XSS/SSRF/SQLi et chiffrement AES-256-GCM.
* **Phase 10 : Déploiement & Préparation Production** — Configuration d'environnement, stratégie de migration, plan de reprise et observabilité.

---

## 3. VARIABLES D'ENVIRONNEMENT PRINCIPALES

Consulter `.env.example` pour la liste exhaustive des variables requises :
* `PORT`, `NODE_ENV`, `APP_URL`, `DATABASE_URL`
* `TOKEN_ENCRYPTION_KEY`, `JWT_SECRET`
* `ETSY_CLIENT_ID`, `ETSY_CLIENT_SECRET`, `ETSY_REDIRECT_URI`
* `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_REDIRECT_URI`
* `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_ANALYSIS_DAILY_LIMIT`
