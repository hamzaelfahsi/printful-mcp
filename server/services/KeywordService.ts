export interface StoredKeyword {
  id: string;
  keyword: string;
  platform: 'etsy' | 'pinterest' | 'both';
  category: string;
  productId?: string;
  source: 'AI_SUGGESTION' | 'MANUAL' | 'VERIFIED_PERFORMANCE_DATA';
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

export class KeywordService {
  private static instance: KeywordService;
  private keywords: Map<string, StoredKeyword> = new Map();

  private constructor() {
    this.seedDefaultKeywords();
  }

  public static getInstance(): KeywordService {
    if (!KeywordService.instance) {
      KeywordService.instance = new KeywordService();
    }
    return KeywordService.instance;
  }

  private seedDefaultKeywords() {
    const seed = [
      { kw: 'stained glass phone case', platform: 'both', cat: 'Art Style' },
      { kw: 'celestial dragon artwork', platform: 'both', cat: 'Theme' },
      { kw: 'japanese anime phone cover', platform: 'etsy', cat: 'Niche' },
      { kw: 'gold foil aesthetic case', platform: 'pinterest', cat: 'Design' },
      { kw: 'mystic kitsune fox case', platform: 'both', cat: 'Theme' },
      { kw: 'otaku protective cover', platform: 'etsy', cat: 'Audience' }
    ] as const;

    seed.forEach((s, idx) => {
      const id = `kw_${idx + 1}`;
      this.keywords.set(s.kw.toLowerCase().trim(), {
        id,
        keyword: s.kw,
        platform: s.platform,
        category: s.cat,
        source: 'AI_SUGGESTION',
        usageCount: 1,
        createdAt: new Date().toISOString()
      });
    });
  }

  /**
   * Adds or updates a keyword with deduplication
   */
  public addKeyword(data: {
    keyword: string;
    platform: 'etsy' | 'pinterest' | 'both';
    category?: string;
    productId?: string;
    source?: 'AI_SUGGESTION' | 'MANUAL' | 'VERIFIED_PERFORMANCE_DATA';
  }): StoredKeyword {
    const cleanKw = data.keyword.toLowerCase().trim();
    const existing = this.keywords.get(cleanKw);

    if (existing) {
      existing.usageCount++;
      existing.lastUsedAt = new Date().toISOString();
      if (data.productId) existing.productId = data.productId;
      this.keywords.set(cleanKw, existing);
      return existing;
    }

    const newKw: StoredKeyword = {
      id: `kw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      keyword: data.keyword.trim(),
      platform: data.platform,
      category: data.category || 'General',
      productId: data.productId,
      source: data.source || 'AI_SUGGESTION',
      usageCount: 1,
      createdAt: new Date().toISOString()
    };

    this.keywords.set(cleanKw, newKw);
    return newKw;
  }

  public getKeywords(platform?: 'etsy' | 'pinterest' | 'both'): StoredKeyword[] {
    const all = Array.from(this.keywords.values());
    if (!platform) return all;
    return all.filter((k) => k.platform === platform || k.platform === 'both');
  }

  public getGroupedByCategory(): Record<string, StoredKeyword[]> {
    const grouped: Record<string, StoredKeyword[]> = {};
    for (const kw of this.keywords.values()) {
      if (!grouped[kw.category]) grouped[kw.category] = [];
      grouped[kw.category].push(kw);
    }
    return grouped;
  }
}
