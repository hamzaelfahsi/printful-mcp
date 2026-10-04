import { 
  EtsyProduct, 
  EtsyOrder, 
  PinterestBoard, 
  PinterestPin, 
  ContentItem, 
  AffiliateLink, 
  AIInsight, 
  SystemNotification,
  DashboardKPIs
} from '../types/index.js';

export const DEMO_KPIS: DashboardKPIs = {
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

export const DEMO_PRODUCTS: EtsyProduct[] = [
  {
    id: 'prod_1',
    listingId: 1849203941,
    title: 'Japanese Celestial Dragon Stained Glass Art Phone Case',
    description: 'Intricate 2D anime-inspired Japanese Celestial Dragon illustration with gold accents and stained glass aesthetic. Hand-finished matte protection case.',
    priceAmount: 34.90,
    currencyCode: 'USD',
    quantity: 48,
    status: 'active',
    tags: ['dragon phone case', 'anime aesthetic', 'stained glass', 'gold foil art', 'japanese art', 'gift for anime lover'],
    materials: ['Polycarbonate', 'TPU Shockproof Liner', 'UV Protected Matte Inks'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    allImages: [
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80'
    ],
    viewsCount: 8421,
    favoritesCount: 680,
    salesCount: 64,
    revenueAmount: 2233.60,
    conversionRate: 2.25,
    etsyUrl: 'https://etsy.com/listing/1849203941/japanese-dragon-case',
    lastModifiedEtsy: '2026-09-28T14:22:00Z',
    lastSyncedAt: '2026-10-03T04:00:00Z'
  },
  {
    id: 'prod_2',
    listingId: 1849203942,
    title: 'Mystic Kitsune Fox Deity Art Nouveau Phone Case',
    description: 'Elegant Nine-Tailed Kitsune Spirit surrounded by lotus flowers and glowing celestial runes. Rich midnight indigo and radiant gold hues.',
    priceAmount: 36.50,
    currencyCode: 'USD',
    quantity: 32,
    status: 'active',
    tags: ['kitsune case', 'nine tailed fox', 'art nouveau', 'japanese folklore', 'aesthetic phone cover'],
    materials: ['Impact Resistant Polycarbonate', 'Matte Finish'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    allImages: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80'
    ],
    viewsCount: 4120,
    favoritesCount: 410,
    salesCount: 43,
    revenueAmount: 1569.50,
    conversionRate: 4.83,
    etsyUrl: 'https://etsy.com/listing/1849203942/mystic-kitsune-case',
    lastModifiedEtsy: '2026-09-26T11:10:00Z',
    lastSyncedAt: '2026-10-03T04:00:00Z'
  },
  {
    id: 'prod_3',
    listingId: 1849203943,
    title: 'Ethereal Cosmic Koi Pond Stained Glass Case',
    description: 'Serene Twin Koi swimming through stardust and celestial petals with brilliant emerald and turquoise hues.',
    priceAmount: 32.00,
    currencyCode: 'USD',
    quantity: 15,
    status: 'active',
    tags: ['koi fish case', 'celestial art', 'stained glass design', 'japanese garden', 'unique case'],
    materials: ['Dual Layer Shockproof Case'],
    primaryImageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    allImages: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80'
    ],
    viewsCount: 2310,
    favoritesCount: 150,
    salesCount: 35,
    revenueAmount: 1120.00,
    conversionRate: 3.20,
    etsyUrl: 'https://etsy.com/listing/1849203943/cosmic-koi-case',
    lastModifiedEtsy: '2026-09-21T09:40:00Z',
    lastSyncedAt: '2026-10-03T04:00:00Z'
  }
];

export const DEMO_ORDERS: EtsyOrder[] = [
  {
    id: 'ord_1',
    receiptId: 394829104,
    buyerName: 'Sophie Moreau',
    totalAmount: 69.80,
    currencyCode: 'USD',
    status: 'paid',
    itemsCount: 2,
    itemsSummary: [
      { title: 'Japanese Celestial Dragon Case (iPhone 16 Pro)', quantity: 1, price: 34.90 },
      { title: 'Mystic Kitsune Fox Deity Case (iPhone 16)', quantity: 1, price: 34.90 }
    ],
    createdAt: '2026-10-02T18:45:00Z'
  },
  {
    id: 'ord_2',
    receiptId: 394829105,
    buyerName: 'Alexander Hayes',
    totalAmount: 36.50,
    currencyCode: 'USD',
    status: 'shipped',
    itemsCount: 1,
    itemsSummary: [
      { title: 'Mystic Kitsune Fox Deity Case (Samsung S25 Ultra)', quantity: 1, price: 36.50 }
    ],
    createdAt: '2026-10-02T11:15:00Z'
  }
];

export const DEMO_BOARDS: PinterestBoard[] = [
  {
    id: 'board_1',
    name: 'Aesthetic Phone Cases & Art',
    description: 'Curated anime, celestial, and art nouveau handcrafted phone cases for art lovers.',
    privacy: 'PUBLIC',
    pinCount: 42,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'board_2',
    name: 'Japanese Folklore & Celestial Vibes',
    description: 'Dragons, Kitsune spirits, koi aesthetics and mystical inspirations.',
    privacy: 'PUBLIC',
    pinCount: 28,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80'
  }
];

export const DEMO_PINS: PinterestPin[] = [
  {
    id: 'pin_101',
    title: 'Transform your daily carry with this Celestial Dragon Artwork Case ✨',
    description: 'Intricate stained glass & gold foil inspired anime aesthetic. Handcrafted with shockproof durability. Tap to discover the collection on Etsy! #AestheticPhoneCase #AnimeStyle #EtsyFinds',
    boardId: 'board_1',
    boardName: 'Aesthetic Phone Cases & Art',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    destinationUrl: 'https://etsy.com/listing/1849203941',
    createdAt: '2026-09-29T10:00:00Z',
    impressions: 48900,
    saves: 1420,
    outboundClicks: 2150,
    ctr: 4.39
  },
  {
    id: 'pin_102',
    title: 'Mystic Kitsune Art Nouveau Case • Pure Japanese Folklore Magic 🦊',
    description: 'Stunning midnight indigo tones and ethereal deity design. Ready to ship worldwide. Tap to view on Etsy! #KitsuneArt #EtsySeller #AestheticTech',
    boardId: 'board_2',
    boardName: 'Japanese Folklore & Celestial Vibes',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    destinationUrl: 'https://etsy.com/listing/1849203942',
    createdAt: '2026-09-27T15:30:00Z',
    impressions: 32100,
    saves: 980,
    outboundClicks: 1430,
    ctr: 4.45
  }
];

export const DEMO_CONTENT_QUEUE: ContentItem[] = [
  {
    id: 'queue_1',
    productId: 'prod_1',
    productTitle: 'Japanese Celestial Dragon Stained Glass Art Phone Case',
    targetPlatform: 'pinterest',
    title: 'Celestial Dragon Stained Glass Vibes ✨ High-Durability Art Case',
    description: 'Upgrade your phone aesthetic with rich gold accents and vivid stained glass anime art. Tap to shop directly on Etsy!',
    keywords: ['dragon aesthetic', 'anime phone case', 'stained glass art'],
    callToAction: 'Shop on Etsy Now',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    destinationUrl: 'https://etsy.com/listing/1849203941',
    targetBoardId: 'board_1',
    targetBoardName: 'Aesthetic Phone Cases & Art',
    status: 'scheduled',
    scheduledDate: '2026-10-04T10:00:00Z',
    createdAt: '2026-10-02T14:00:00Z',
    updatedAt: '2026-10-02T14:30:00Z',
    approvalRequired: true
  },
  {
    id: 'queue_2',
    productId: 'prod_2',
    productTitle: 'Mystic Kitsune Fox Deity Art Nouveau Phone Case',
    targetPlatform: 'pinterest',
    title: 'The Nine-Tailed Spirit Protector • Aesthetic Phone Cover',
    description: 'Intricate Art Nouveau detailing and celestial gold foil look. Discover our bestselling artwork case on Etsy!',
    keywords: ['kitsune phone case', 'art nouveau cover', 'anime aesthetic'],
    callToAction: 'Explore the Collection',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    destinationUrl: 'https://etsy.com/listing/1849203942',
    targetBoardId: 'board_2',
    targetBoardName: 'Japanese Folklore & Celestial Vibes',
    status: 'ready',
    createdAt: '2026-10-03T01:15:00Z',
    updatedAt: '2026-10-03T01:15:00Z',
    approvalRequired: true
  }
];

export const DEMO_AFFILIATE_LINKS: AffiliateLink[] = [
  {
    id: 'aff_1',
    campaignName: 'Pinterest Autumn Showcase 2026',
    trackingCode: 'pin-autumn-dragon',
    productId: 'prod_1',
    productTitle: 'Japanese Celestial Dragon Case',
    originalUrl: 'https://etsy.com/listing/1849203941',
    affiliateUrl: 'https://etsy.me/3XkL98Q?utm_source=etsypilot&utm_campaign=autumn',
    isActive: true,
    totalClicks: 1420,
    uniqueClicks: 1190,
    conversions: 24,
    commission: 84.50,
    createdAt: '2026-09-15T10:00:00Z'
  },
  {
    id: 'aff_2',
    campaignName: 'Anime Art Nouveau Special',
    trackingCode: 'anime-kitsune-glass',
    productId: 'prod_2',
    productTitle: 'Mystic Kitsune Fox Deity Case',
    originalUrl: 'https://etsy.com/listing/1849203942',
    affiliateUrl: 'https://etsy.me/49YqK1M?utm_source=etsypilot&utm_campaign=kitsune',
    isActive: true,
    totalClicks: 890,
    uniqueClicks: 740,
    conversions: 31,
    commission: 122.80,
    createdAt: '2026-09-20T14:30:00Z'
  }
];

export const DEMO_INSIGHTS: AIInsight[] = [
  {
    id: 'ins_1',
    productId: 'prod_1',
    productTitle: 'Japanese Celestial Dragon Case',
    category: 'HIGH_TRAFFIC',
    summary: 'Trafic Pinterest très élevé (5.2k clics) mais conversion Etsy à 2.25%. Potentiel de gain de +$750/mois en optimisant la description et les photos secondaires.',
    dataTrigger: 'Pinterest Outbound Clicks > 5,000 & Etsy Conversion < 2.5%',
    recommendedActions: [
      'Ajouter une vidéo 4K en gros plan des reflets or et détails vitrail dans Etsy',
      'Intégrer les avis clients 5 étoiles dans les 3 premières lignes de la description',
      'Créer 2 variantes d’épingles Pinterest mettant l’accent sur la protection antichoc'
    ],
    metrics: {
      views: 8421,
      clicks: 1420,
      sales: 32,
      conversion: 2.25
    },
    createdAt: '2026-10-02T08:00:00Z'
  },
  {
    id: 'ins_2',
    productId: 'prod_2',
    productTitle: 'Mystic Kitsune Stained Glass Art Case',
    category: 'HIGH_CONVERSION',
    summary: 'Taux de conversion exceptionnel de 4.83% avec un panier moyen supérieur. Produit phare à amplifier sur Pinterest.',
    dataTrigger: 'Conversion Rate > 4.0% & Favorites/Views Ratio > 15%',
    recommendedActions: [
      'Augmenter la cadence de publication Pinterest (3 Pins/semaine avec angles visuels variés)',
      'Lancer une campagne de lien affilié ciblée sur les boards Anime & Art Nouveau',
      'Créer un design dérivé (thème Kitsune Lunaire argenté)'
    ],
    metrics: {
      views: 4120,
      clicks: 890,
      sales: 43,
      conversion: 4.83
    },
    createdAt: '2026-10-01T16:20:00Z'
  }
];

export const DEMO_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif_1',
    severity: 'success',
    title: 'Épingle Pinterest publiée avec succès',
    message: 'Votre Pin "Celestial Dragon Stained Glass Vibes" a été publié sur le tableau "Aesthetic Phone Cases & Art".',
    timestamp: 'Il y a 25 minutes',
    isRead: false
  },
  {
    id: 'notif_2',
    severity: 'info',
    title: 'Synchronisation Etsy terminée',
    message: '24 listings et 142 commandes synchronisés avec succès depuis l’API Etsy v3.',
    timestamp: 'Il y a 1 heure',
    isRead: false
  },
  {
    id: 'notif_3',
    severity: 'warning',
    title: 'Nouveau contenu en attente d’approbation',
    message: '1 projet de Pin pour "Mystic Kitsune Case" est prêt dans votre file d’attente.',
    timestamp: 'Il y a 3 heures',
    isRead: true
  }
];
