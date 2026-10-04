import { DashboardKPIs, AIInsight } from '../../src/types/index.js';

export class AnalyticsService {
  public static getKPIs(): DashboardKPIs {
    return {
      etsy: {
        totalProducts: 24,
        activeListings: 19,
        views: 14850,
        viewsTrend: 18.4,
        favorites: 1240,
        favoritesTrend: 14.2,
        orders: 142,
        ordersTrend: 12.0,
        revenue: 4320.50,
        revenueTrend: 21.8
      },
      pinterest: {
        impressions: 184500,
        impressionsTrend: 34.2,
        saves: 4920,
        savesTrend: 22.8,
        outboundClicks: 5210,
        clicksTrend: 31.0,
        ctr: 2.82,
        ctrTrend: 0.45,
        publishedPins: 86
      },
      traffic: {
        etsyDirect: 8420,
        pinterestReferral: 5210,
        trackedAffiliateClicks: 1840,
        totalTrackedClicks: 7050
      },
      monetization: {
        totalRevenue: 4320.50,
        revenueTrend: 21.8,
        conversionRate: 2.95,
        affiliateRevenue: 384.20
      }
    };
  }

  public static generateInsights(): AIInsight[] {
    return [
      {
        id: 'ins_1',
        productId: 'prod_1',
        productTitle: 'Japanese Celestial Dragon Case',
        category: 'HIGH_TRAFFIC',
        summary: 'Trafic Pinterest exceptionnel (5.2k clics) mais conversion Etsy à 2.1%. Opportunité d’optimisation du listing.',
        dataTrigger: 'Pinterest Outbound Clicks > 5,000 & Etsy Conversion < 2.5%',
        recommendedActions: [
          'Ajouter une vidéo de démonstration dans le listing Etsy',
          'Tester un titre alternatif ciblant les amateurs de Dark Fantasy',
          'Créer 2 variantes de Pins mettant en avant les finitions dorées'
        ],
        metrics: {
          views: 8421,
          clicks: 1420,
          sales: 32,
          conversion: 2.25
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'ins_2',
        productId: 'prod_2',
        productTitle: 'Mystic Kitsune Stained Glass Art Case',
        category: 'HIGH_CONVERSION',
        summary: 'Taux de conversion élevé (4.8%) avec un fort taux de mise en favoris.',
        dataTrigger: 'Conversion Rate > 4.0% & Favorites/Views Ratio > 15%',
        recommendedActions: [
          'Augmenter le volume de publication Pinterest sur ce produit (3 Pins/semaine)',
          'Associer ce produit à une campagne d’affiliation dédiée',
          'Créer un bundle avec un modèle complémentaire'
        ],
        metrics: {
          views: 4120,
          clicks: 890,
          sales: 43,
          conversion: 4.83
        },
        createdAt: new Date().toISOString()
      }
    ];
  }
}
