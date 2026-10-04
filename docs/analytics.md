# ETSYPILOT AI — ANALYTICS, TRACKING & PERFORMANCE CENTER (PHASE 6)

## 1. ARCHITECTURE OVERVIEW

Le Centre d'Analytics & Tracking d'EtsyPilot AI consolide, normalise et analyse les flux de données officiels issus de :
1. **Etsy Open API v3** (Boutique, listings, commandes et reçus).
2. **Pinterest Business API v5** (Compte, tableaux, épingles et métriques organiques 90 jours).
3. **Moteur de Publication EtsyPilot AI** (Tâches exécutées, horodatage UTC, ID externes).
4. **Moteur de Tracking First-Party & Attribution** (Liens avec redirection sécurisée, sessions anonymisées, respect strict de la séparation clics / conversions / commissions).
5. **Génération d'Insights IA (Gemini)** (Ancrage factuel strict sur les données vérifiées, interdiction formelle d'inventer des chiffres).

---

## 2. DATA PROVENANCE & STRICT QUALITY LABELS

Chaque métrique affichée dans le tableau de bord dispose d'un statut de provenance immuable :

| Statut Provenance | Description | Badge UI |
| :--- | :--- | :--- |
| `API_VERIFIED` | Donnée brute certifiée par l'API officielle (Etsy v3 ou Pinterest v5). | Vert (API Vérifiée) |
| `INTERNAL_CALCULATION` | Métrique calculée par le moteur EtsyPilot AI (ex: taux de conversion, volume de publication). | Bleu (Calcul Interne) |
| `AI_ESTIMATE` | Estimation ou recommandation générée par l'IA (clairement identifiée). | Violet (Suggestion IA) |
| `API_UNAVAILABLE` | Donnée non exposée par l'API publique (ex: vues détaillées en temps réel vendeur Etsy). | Gris (Non disponible API v3) |

---

## 3. DATABASE SCHEMA & DAILY NORMALIZATION

### Table `analytics_daily`
Stockage quotidien normalisé avec contrainte d'unicité absolue :
```sql
CONSTRAINT uq_analytics_daily UNIQUE (
    platform,
    account_id,
    shop_id,
    pin_id,
    listing_id,
    date,
    metric_name
);
```

### Table `analytics_sync_runs`
Traçabilité complète de chaque session de synchronisation :
- Statuts : `RUNNING`, `SUCCESS`, `PARTIAL`, `FAILED`.
- Compteurs : `records_fetched`, `records_created`, `records_updated`, `records_skipped`, `error_count`.
- Journalisation d'audit via `AuditService` (zéro secret / token dans les logs).

### Table `tracking_links`
Liens de tracking first-party avec protection anti open-redirect et zero-PII session hashing.

---

## 4. ETSY OPEN API v3 METRICS & LIMITATIONS

### Métriques Officielles Disponibles :
- Informations de boutique (`shop_id`, `shop_name`, `title`, `currency_code`).
- Listings actifs et statut (`listing_id`, `title`, `price`, `quantity`, `state`).
- Reçus et commandes (`receipt_id`, `total_amount`, `status`, `items_summary`).
- Ventes confirmées calculées à partir des commandes validées.

### Limitations Officielles Documentées :
- **Vues & Favoris en temps réel** : L'API publique Etsy Open API v3 n'expose pas le flux complet des vues privées des vendeurs. EtsyPilot AI marque explicitement ces champs comme `API_UNAVAILABLE` au lieu de fabriquer de faux nombres.
- **Pagination** : Utilisation du standard Etsy `limit` (max 100) et `offset` (max 12000).

---

## 5. PINTEREST BUSINESS API v5 METRICS

### Métriques Organiques Supportées (Lookback 90 jours) :
- Compte : `follower_count`, `following_count`, `board_count`, `pin_count`, `monthly_views`.
- Épingles : `impressions`, `saves` (enregistrements), `outbound_clicks` (clics sortants), `pin_clicks`, `ctr`.
- **Pagination** : Pagination par `bookmark` avec des tailles de page jusqu'à 250 éléments.

---

## 6. FIRST-PARTY TRACKING & ATTRIBUTION RULES

1. **Anti Open-Redirect** : Vérification stricte des domaines cibles autorisés (`etsy.com`, `pinterest.com`, `craftcases.studio` ou URLs relatives).
2. **Confidentialité & Zero PII** : Aucun stockage d'adresse IP brute. Les sessions anonymes sont hachées avec salt quotidien : `SHA-256(ip + userAgent + salt)`.
3. **Séparation Stricte** :
   - `Clics != Conversions`
   - `Conversions != Commissions`
   - Les commissions ne sont calculées que lorsqu'un lien de conversion valide est établi.
4. **Vocabulaire Neutre** : Utilisation des statuts `DIRECT`, `TRACKED_CLICK`, `UNKNOWN` et de la mention *"Performance après publication"* plutôt que de revendiquer une causalité non prouvée.

---

## 7. AI INSIGHTS GROUNDING

- Le service `AIInsightService` injecte uniquement des métriques vérifiées au prompt d'analyse.
- L'IA identifie les opportunités SEO, de timing et d'engagement sans jamais inventer de métriques manquantes.
- Toutes les suggestions sont identifiées par le label `RECOMMANDATIONS IA`.

---

## 8. SÉCURITÉ & AUDIT

- Aucun jeton OAuth, clé API ou secret n'est exposé au frontend.
- Les logs d'audit et les notifications système sont filtrés et anonymisés.
- Chiffrement symétrique AES-256-GCM maintenu pour tous les tokens en base.
