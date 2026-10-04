# ETSYPILOT AI — PERFORMANCE HARDENING & OPTIMIZATION (PHASE 9)

## 1. PERFORMANCE ARCHITECTURE & METRICS

EtsyPilot AI est optimisé pour garantir une latence minimale, une scalabilité prévisible et une maîtrise stricte des coûts d'API (Gemini, Etsy, Pinterest).

---

## 2. OPTIMISATIONS APPLIQUÉES

### A. Indexation & Requêtes Base de Données
* Indexation sur les clés étrangères et discriminantes :
  * `idx_scheduled_posts_due (scheduled_for, status)`
  * `idx_analytics_daily_platform_date (platform, date)`
  * `idx_tracking_links_code (tracking_code)`
  * `idx_ai_insights_v2_status (status, created_at DESC)`
* Prévention des requêtes N+1 par l'agrégation en amont des données temporelles.

### B. Moteur IA & Contrôle des Coûts
* **Plafond Journalier** : `AI_ANALYSIS_DAILY_LIMIT = 50` appels par jour.
* **Mise en cache** : Les calculs de tendances et diagnostics journaliers sont mis en cache et recalculés sur demande.
* **Taille de Contexte Minimale** : Injection exclusive des données agrégées pertinentes (séries de 30 jours, ratios clés) sans transmission de dumps de base de données non filtrés.

### C. Planificateur de Publication & Mutex
* **Sécurité Anti-Course** : Mutex mémoire empêchant l'exécution simultanée d'un même travail de publication.
* **Idempotence** : Clé d'idempotence composite `SHA-256(content_id + target_platform + scheduled_time)` garantissant l'unicité stricte d'une publication.

### D. Synchronisation Incrémentale des Analytics
* Synchronisation différentielle par date (fenêtre glissante de 30 jours) sans téléchargement redondant de l'historique complet.

### E. Frontend Performance & Bundle Size
* Code-splitting par composants et vues dynamiques (`React.lazy`).
* Évitement des bibliothèques de graphiques tierces lourdes au profit d'un composant de visualisation SVG/Tailwind ultra-léger et déterministe.
