# ETSYPILOT AI — DISASTER RECOVERY & BUSINESS CONTINUITY (PHASE 10)

## 1. OBJECTIFS DE REPRISE D'ACTIVITÉ

* **RPO (Recovery Point Objective)** : `NOT_DEFINED` (En attente de provisionnement de la politique de rétention PostgreSQL managée par l'hébergeur de production ; cible recommandée : 24 heures).
* **RTO (Recovery Time Objective)** : `NOT_DEFINED` (Cible recommandée : < 1 heure pour le redéploiement d'une instance saine).

---

## 2. SCÉNARIOS DE DÉFAILLANCE & PROCÉDURES DE REPRISE

### A. Perte ou Corruption de la Base de Données
1. Isoler l'application en mode maintenance via le proxy/CDN.
2. Restaurer le dernier snapshot PostgreSQL managé.
3. Vérifier l'intégrité de la table `oauth_tokens` et des liaisons `users`.
4. Relancer le service Web et exécuter `GET /api/health`.

### B. Gestion des Clés de Chiffrement des Tokens
* **RÈGLE CRITIQUE** : La variable `TOKEN_ENCRYPTION_KEY` ne doit JAMAIS être modifiée ou régénérée en production sans procédure de rechiffrement préalable, sous peine de rendre tous les jetons OAuth existants indéchiffrables.

### C. Panne des APIs Externes (Etsy / Pinterest / Gemini)
* Le système passe automatiquement en mode résilient :
  * Les requêtes en échec 429/500 déclenchent un backoff exponentiel (max 3 tentatives).
  * Les données non récupérables sont étiquetées `API_UNAVAILABLE` sans provoquer de plantage de l'application.
  * Les tâches du planificateur échouées basculent à l'état `FAILED` avec journalisation dans `AuditService`.
