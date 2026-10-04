# ETSYPILOT AI — MONETIZATION & AFFILIATE ENGINE (PHASE 7)

## 1. ARCHITECTURE OVERVIEW

Le Moteur de Monétisation & d'Affiliation d'EtsyPilot AI gère le cycle de vie financier des partenariats commerciaux avec une stricte étanchéité des étapes :

```text
AFFILIATE LINK
      ↓
TRACKING LINK (/t/:code)
      ↓
CLIC (Observé)
      ↓
CONVERSION (Importée / Observée)
      ↓
VENTE ÉLIGIBLE (Qualifying Sale — Cookie 30j)
      ↓
COMMISSION (En attente → Approuvée → Versée)
      ↓
VERSEMENT (Payout Reçu)
```

**RÈGLE CARDINALE :**
* Un clic N'EST PAS une conversion.
* Une conversion N'EST PAS automatiquement une vente éligible.
* Une vente éligible NE SIGNIFIE PAS que la commission est payée.
* Aucune commission n'est calculée à partir de clics bruts ou de taux inventés.

---

## 2. AFFILIATE PROVIDER ABSTRACTION

Le programme d'affiliation officiel d'Etsy est opéré via des réseaux tiers d'affiliation (ex: Awin, Creator Collective). L'API publique `openapi.etsy.com` n'expose pas de reporting de commissions.

L'interface `IAffiliateProvider` définit les méthodes :
* `getAccount()`
* `getConversions()`
* `getCommissions()`
* `getPayouts()`
* `getStatus()` : `CONNECTED`, `DISCONNECTED`, `NOT_CONFIGURED`, `UNAVAILABLE`.

Si aucun identifiant réseau direct n'est configuré :
* `provider.getStatus() === 'NOT_CONFIGURED'`
* Le système supporte l'importation sécurisée `MANUAL_IMPORT` via CSV et JSON.

---

## 3. ÉTATS DES DONNÉES FINANCIÈRES

### Conversions (`affiliate_conversions`)
* `CLICKED` : Clic d'intention enregistré.
* `CONVERTED` : Achat brut enregistré par le marchand.
* `QUALIFYING` : Vente répondant aux critères d'éligibilité (canal autorisé, période de cookie active).
* `REJECTED` : Achat non éligible (ex: auto-achat, retour produit).
* `CANCELLED` / `RETURNED` : Commande annulée ou remboursée.

### Commissions (`affiliate_commissions`)
* `PENDING` : Commission en attente de clôture de période de rétractation.
* `APPROVED` : Commission validée par le marchand.
* `REJECTED` / `REVERSED` : Commission refusée ou annulée suite à litige.
* `PAID` : Fonds transférés dans le solde de versement.

### Versements (`affiliate_payouts`)
* `PENDING` : Virement en cours de traitement bancaire.
* `PAID` : Fonds réceptionnés et clôturés.
* `FAILED` : Échec du transfert.

---

## 4. CONFORMITÉ & MENTIONS OBLIGATOIRES (AFFILIATE DISCLOSURE)

1. **Mentions Légales Obligatoires** : Chaque campagne comporte un texte de divulgation clair et visible (*« Certains liens sont des liens affiliés. Je peux percevoir une commission sur les achats éligibles. »*).
2. **Canaux Autorisés** : Statut du canal (`AUTHORIZED`, `NOT_AUTHORIZED`, `PENDING_REVIEW`). L'activation d'une campagne sur un canal non autorisé est strictement bloquée par le moteur.
3. **Période de Cookie** : Respect de la fenêtre de 30 jours (ou 7 jours pour Creator Collective / App).

---

## 5. SÉCURITÉ DE L'IMPORTATION CSV / JSON

1. **Protection Anti Formule CSV (Formula Injection)** : Neutralisation systématique des caractères déclencheurs (`=`, `+`, `-`, `@`, `\t`, `\r`) par préfixage d'apostrophe.
2. **Détection des Doublons** : Unicité stricte garantie sur la clé composite `(affiliate_account_id, external_id)`.
3. **Limite de Taille** : Taille maximale fixée à 5 Mo par fichier.
4. **Validation des Devises & Nombres** : Contrôle ISO 4217 (`USD`, `EUR`, `GBP`, `CAD`, `AUD`) et rejet des valeurs non numériques.

---

## 6. PROVENANCE DES DONNÉES

Chaque donnée monétaire affiche sa provenance :
* `IMPORTED_PROVIDER_DATA` : Rapport officiel importé du réseau.
* `API_VERIFIED` : Donnée directe d'API de réseau connecté.
* `INTERNAL_CALCULATION` : Métrique calculée en interne (ex: clics first-party).

---

## 7. APPROVAL GATE HUMAIN (PHASE 5 INTACTE)

Aucune publication de contenu avec lien affilié n'est réalisée automatiquement sans passer par l'Approval Gate :
`DRAFT → GENERATED → REVIEW → APPROVED → SCHEDULED → PUBLISHED`.
