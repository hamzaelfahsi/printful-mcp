# ETSYPILOT AI — PRODUCTION ROLLBACK PROCEDURES (PHASE 10)

## 1. APPLICATION CODE ROLLBACK

1. Identifier le commit stable précédent via Git / CI/CD.
2. Déclencher le redéploiement de la version précédente via Render / Cloud Console (`Rollback to this deploy`).
3. Vérifier le retour à l'état nominal via l'endpoint `/api/health`.

---

## 2. DATABASE SCHEMA ROLLBACK

1. En cas d'erreur de migration DDL, exécuter le script de rollback spécifique (`down.sql`).
2. Si des données ont été altérées, restaurer l'instantané de base de données pris immédiatement avant le déploiement.
3. Ne jamais supprimer manuellement des tables de tokens ou d'utilisateurs sans validation administrative.

---

## 3. OAUTH & CREDENTIAL ROLLBACK

* Si des clés OAuth sont révoquées ou corrompues :
  1. Générer une nouvelle paire Client ID / Secret sur le portail développeur Etsy/Pinterest.
  2. Mettre à jour les variables d'environnement de production.
  3. Redémarrer le service Web (les utilisateurs devront reconnecter leur boutique).
