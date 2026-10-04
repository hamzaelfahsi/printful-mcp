# Documentation Base de Données, Sécurité, Analytics et Déploiement

## 1. Sécurité (security.md)
- **Stockage des secrets** : Variables d'environnement strictes (`.env`), jamais commitées dans Git.
- **Chiffrement des Tokens OAuth** : Chiffrement symétrique AES-256-GCM avant stockage dans la table `oauth_tokens`.
- **Logs d'audit** : Traçabilité immuable de chaque action critique (`audit_logs`).

## 2. Analytics (analytics.md)
- Métriques Etsy : Vues, Favoris, Commandes, Chiffre d'affaires, Taux de conversion.
- Métriques Pinterest : Impressions, Épingles enregistrées (Saves), Clics sortants (Outbound clicks), CTR.
- Règles AI Insights : Classification déterministe basée sur les données réelles (HIGH_TRAFFIC, HIGH_ENGAGEMENT, HIGH_CONVERSION, GROWING, DECLINING, INSUFFICIENT_DATA).

## 3. Déploiement (deployment.md)
- Compatible Node.js / Google Cloud Run / Docker.
- Port par défaut : 3000.
