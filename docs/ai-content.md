# Moteur IA & Optimisations SEO — Spécifications Techniques (Phase 4)

## 1. Vue d'ensemble
Le moteur **AI Content & SEO** d'EtsyPilot AI est propulsé par **Gemini 3.8 Flash** via le SDK officiel `@google/genai`. Il permet de générer des titres, descriptions, 13 tags Etsy et épingles Pinterest optimisés à partir des caractéristiques réelles des produits.

---

## 2. Règle Fondamentale : Zéro Publication Directe par l'IA

```
PRODUIT / DESIGN
       │
       ▼
GÉNÉRATION IA (Gemini 3.8 Flash)
       │
       ▼
ÉTAT DRAFT (content_v1, content_v2...)
       │
       ▼
REVUE PAR L'UTILISATEUR (Comparaison de versions)
       │
       ▼
APPROBATION HUMAINE EXPLICITE (État APPROVED via ConfirmDialog)
       │
       ▼
PROGRAMMATION / FILE D'ATTENTE (scheduled_posts)
       │
       ▼
PUBLICATION OFFICIELLE (POST /v5/pins ou PATCH Etsy)
```
*L'IA ne peut en aucun cas déclencher une publication publique sans l'accord préalable de l'utilisateur.*

---

## 3. Sorties Structurées (JSON Schema Validation)
Chaque réponse générée par Gemini est contrainte par un `responseSchema` typé (`responseMimeType: "application/json"`).

### Schéma Etsy SEO
* **`title` :** Titre lisible et attractif, limité à 140 caractères (sans bourrage de mots-clés).
* **`description` :** Description marchande structurée mettant en valeur la qualité et les caractéristiques techniques.
* **`tags` :** Tableau de **13 tags distincts** (strings individuelles sans ponctuation).
* **`keywords` :** Requêtes de recherche prioritaires.
* **`categorySuggestions` :** Recommandations de catégories Etsy.

### Schéma Pinterest
* **`title` :** Titre accrocheur adapté aux flux Pinterest (max 100 caractères).
* **`description` :** Texte optimisé avec appel à l'action.
* **`keywords` :** Hashtags et mots-clés thématiques.
* **`altText` :** Description factuelle pour l'accessibilité visuelle.
* **`suggestedBoard` :** Recommandation du tableau le plus pertinent.

---

## 4. Moteur de Versioning (`ContentVersioningService`)
* Chaque nouvelle génération ou réécriture incrémente un numéro de version (`content_v1`, `content_v2`, `content_v3`...).
* L'utilisateur peut à tout moment prévisualiser, restaurer ou comparer une version antérieure.
* L'approbation fige la version sélectionnée et lui associe un horodatage immuable.

---

## 5. Moteur de Mots-Clés (`KeywordService`)
* Stockage et regroupement par thématiques (Niche, Style artistique, Audience).
* Déduplication automatique insensible à la casse et aux espaces.
* **Distinction stricte :** Chaque mot-clé est étiqueté `AI_SUGGESTION` tant qu'il n'est pas consolidé avec des métriques de clics et de ventes réelles (`VERIFIED_PERFORMANCE_DATA`).

---

## 6. Sécurité & Protection contre le Prompt Injection
* Les données provenant du catalogue produit sont injectées dans le prompt comme **données brutes non fiables** (DATA) et non comme instructions système.
* Filtrage des termes d'altération de prompt (`ignore previous instructions`, `system prompt`, `developer mode`).
* Clé d'API `GEMINI_API_KEY` strictement cantonnée au serveur backend (zéro fuite client).
* Throttling, gestion du statut HTTP 429 avec backoff exponentiel et timeout de 15 secondes.
