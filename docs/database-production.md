# ETSYPILOT AI — DATABASE PRODUCTION & MIGRATION STRATEGY (PHASE 10)

## 1. POSTGRESQL ARCHITECTURE

L'application utilise une base de données relationnelle PostgreSQL pour garantir l'intégrité transactionnelle (ACID) :

* **Format d'URL de connexion** : `DATABASE_URL=postgresql://user:password@host:5432/etsypilot_db?sslmode=require`
* **Pooling & Timeouts** : Pool de connexions géré avec un maximum de 20 connexions concurrentes et timeout d'acquisition fixé à 10 000 ms.
* **Encodage & Fuseau** : `UTF-8` et stockage temporel universel `TIMESTAMPTZ` (UTC).

---

## 2. SCHÉMA DE PRODUCTION & TABLES CLÉS

Le fichier de référence est `/server/db/schema.sql` :
1. `users` & `oauth_tokens` (Tokens chiffrés en AES-256-GCM avec IV et auth tag).
2. `etsy_shops`, `etsy_listings`, `etsy_orders`, `etsy_sync_runs`.
3. `pinterest_accounts`, `pinterest_boards`, `pinterest_pins`.
4. `generated_contents`, `content_versions`, `keyword_rankings`.
5. `scheduled_posts` & `publication_tasks` (Gouvernance du Planificateur et Approval Gate).
6. `analytics_daily` & `sync_runs` (Métriques d'audience certifiées et provenance).
7. `tracking_links` & `tracking_events` (Tracking first-party Zero-PII).
8. `affiliate_accounts`, `affiliate_campaigns`, `affiliate_conversions`, `affiliate_commissions`, `affiliate_payouts`.
9. `ai_insights_v2` & `ai_experiments` (Moteur d'observations étayées et laboratoire A/B).
10. `audit_logs` & `notifications`.

---

## 3. STRATÉGIE DE MIGRATION DÉTERMINISTE

1. **Initialisation** : Exécution idempotente via `CREATE TABLE IF NOT EXISTS` et `CREATE INDEX IF NOT EXISTS`.
2. **Sauvegarde Préalable** : Déclenchement obligatoire d'un instantané PostgreSQL avant toute modification de structure.
3. **Rollback de Schéma** : Chaque migration dispose d'un script inverse descendant (`down.sql`).
4. **Verrouillage Transactionnel** : Exécution sous transaction `BEGIN ... COMMIT` pour éviter tout état partiel en cas d'erreur.
