# ETSYPILOT AI — DOMAINS, HTTPS & DNS CONFIGURATION (PHASE 10)

## 1. DOMAIN CONFIGURATION STATUS

* **Custom Domain** : `CUSTOM_DOMAIN_NOT_CONFIGURED` (Domaine de référence cible : `https://craftcases.studio`).
* **Environment URLs** :
  * Local Dev : `http://localhost:3000`
  * Cloud Preview / Staging : `https://ais-pre-lui6hgbuegfb2yw74kduiu-221029044484.europe-west2.run.app`
  * Production Target : `https://craftcases.studio`

---

## 2. DNS & SSL/TLS REQUIREMENTS

Pour finaliser le pointage en production :
1. **Enregistrement CNAME** : `app.craftcases.studio` ou `@` pointant vers l'hôte Render/Cloud (`etsypilot-ai.onrender.com`).
2. **Certificat SSL/TLS** : Émission et renouvellement automatique Let's Encrypt / Managed TLS via le fournisseur.
3. **En-têtes HSTS** : Activés automatiquement en production (`max-age=31536000; includeSubDomains`).
4. **Validation OAuth Callback** :
   * Etsy Developer Portal : Déclarer `https://craftcases.studio/api/etsy/auth/callback`
   * Pinterest Developer Portal : Déclarer `https://craftcases.studio/api/pinterest/auth/callback`
