# ETSYPILOT AI — ADVANCED AI INSIGHTS & RECOMMENDATIONS ENGINE (PHASE 8)

## 1. ARCHITECTURE & PIPELINE D'ANALYSE

Le Moteur d'Insights et de Recommandations IA d'EtsyPilot AI opère selon un pipeline déterministe strict :

```text
COLLECTE DES DONNÉES VÉRIFIÉES (Etsy + Pinterest + Monétisation)
                     ↓
NORMALISATION DU CONTEXTE IA (Typage strict, données utilisateurs isolées)
                     ↓
ANALYSE TEMPORELLE & DÉTECTION D'ANOMALIES (TrendAnalysisService + AnomalyDetectionService)
                     ↓
GÉNÉRATION STRUCTURÉE DES OBSERVATIONS (JSON Schema, Prompt Versionné)
                     ↓
VALIDATION FORMELLE DES ALLÉGATIONS (AIClaimValidator)
                     ↓
STOCKAGE & PRÉSENTATION EXPLICABLE (Dashboard avec preuves et suggestions d'actions)
```

---

## 2. MODÈLE DE CONFIANCE DES DONNÉES (DATA TRUST MODEL)

Chaque observation distingue rigoureusement la provenance des métriques :
1. `API_VERIFIED` : Données officielles issues des APIs Etsy Open API v3 et Pinterest API v5.
2. `IMPORTED_PROVIDER_DATA` : Rapports vérifiés importés depuis les réseaux d'affiliation (ex: Awin / Creator Collective).
3. `INTERNAL_CALCULATION` : Métriques calculées localement (ex: clics first-party `/t/:code`).
4. `USER_PROVIDED` : Paramètres et métadonnées saisis par l'utilisateur.
5. `AI_ESTIMATE` : Estimations étiquetées explicitement sans valeur contractuelle.
6. `API_UNAVAILABLE` : Données non exposées par les APIs publiques. **RÈGLE CRITIQUE :** `API_UNAVAILABLE` n'est jamais interprété comme 0 ou simulé.

---

## 3. CONFIANCE CATÉGORIELLE (CATEGORICAL CONFIDENCE)

La confiance est déterminée par le volume et la fraîcheur des données réelles :
* `HIGH` : Échantillon >= 14 points temporels vérifiés.
* `MEDIUM` : Échantillon de 7 à 13 points temporels vérifiés.
* `LOW` / `INSUFFICIENT_DATA` : Moins de 7 points temporels. Aucune tendance artificielle n'est inférée.

---

## 4. VALIDATEUR D'ALLÉGATIONS (AI CLAIM VALIDATOR)

Avant tout enregistrement ou affichage, `AIClaimValidator` contrôle :
1. L'exactitude des chiffres cités par rapport aux tables de la base de données.
2. L'absence de promesses ou de garanties de résultats financiers (*"ventes garanties"*, *"revenu garanti"* strictement rejetés).
3. La non-fabrication de métriques indisponibles (`API_UNAVAILABLE`).
4. L'étanchéité stricte : un clic traqué ne peut être qualifié de vente ou de commission sans rapport réseau confirmé.

---

## 5. DÉFENSE CONTRE L'INJECTION DE PROMPT & HALLUCINATIONS

* **Contextualisation stricte** : Les textes des utilisateurs, fiches et campagnes sont injectés sous forme de données brutes isolées sans exécution d'instructions système.
* **Versionnage des Prompts** : Tous les prompts analytiques sont versionnés (`analytics_insight_v1`, `seo_analysis_v1`, `monetization_analysis_v1`, `experiment_analysis_v1`).
* **Contrôle des Coûts & Limites** : Plafond journalier de requêtes d'analyse (`AI_ANALYSIS_DAILY_LIMIT`), mise en cache des calculs de tendances et exclusion des jetons/secrets de tout contexte d'IA.

---

## 6. CADRE D'EXPÉRIMENTATION A/B (EXPERIMENTS ENGINE)

Permet de tester scientifiquement des variantes de titres, visuels, accroches ou tags :
* Variables supportées : `TITLE`, `DESCRIPTION`, `TAGS`, `KEYWORDS`, `IMAGE_STYLE`, `CTA`, `PUBLICATION_TIME`, `BOARD`.
* Mesure du différentiel d'impact avec avertissement `INSUFFICIENT_SAMPLE` si l'échantillon est inférieur au seuil de pertinence statistique.
* **Respect absolu de la Phase 5** : Aucune expérience n'est publiée automatiquement sur Pinterest ou Etsy sans validation explicite dans l'Approval Gate.

---

## 7. EXPLICABILITÉ SYSTÉMIQUE (WHAT / WHY / DATA / TEST)

Chaque carte d'insight répond à 4 questions :
* **QUOI** : Titre et résumé de l'observation constatée.
* **POURQUOI** : Explication de l'écart statistique ou de l'opportunité.
* **DONNÉES & PREUVES** : Preuves chiffrées avec libellé, valeur précédente, valeur actuelle, % de variation et source certifiée.
* **SUGGESTION D'ACTION** : Test proposé avec renvoi vers le Générateur de Contenu / Planificateur.
