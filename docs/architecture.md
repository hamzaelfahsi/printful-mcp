# Architecture Technique — EtsyPilot AI

## Vue d'ensemble
EtsyPilot AI est une suite SaaS de contrôle pour créateurs et e-commerçants opérant sur Etsy et faisant la promotion de leurs produits via Pinterest.

## Piliers Fondamentaux
1. **Contrôle Utilisateur & Approbation** : Aucune publication automatisée sans validation manuelle.
2. **Intégrité des Données** : Pas de fausses métriques, distinction claire entre données officielles et mode Démo.
3. **Sécurité Zero-Trust** : Tokens OAuth chiffrés (AES-256-GCM), pas de secrets dans le frontend.
4. **Idempotence & Résilience** : Protection contre les doublons d'exécution des jobs de publication.
