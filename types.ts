
export enum NewsClassification {
  BUY = 'BUY',
  HOLD = 'HOLD',
  SELL = 'SELL',
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  // classification: NewsClassification; // REMOVED as per request
  url?: string;
  source?: string;
  publishedAt?: string;
}

export enum AssetType {
  STOCK = 'Ação',
  CRYPTO = 'Cripto',
  FOREX = 'Forex',
  INDEX = 'Índice',
  COMMODITY = 'Commodity',
  FUTURE = 'Futuro',
  ACAO_BR = 'Ação BR',
  ACAO_US = 'Ação US',
  BDR = 'BDR',
}

export const AssetTypeDisplayNames: Record<AssetType, string> = {
  [AssetType.STOCK]: 'Ação',
  [AssetType.CRYPTO]: 'Cripto',
  [AssetType.FOREX]: 'Forex',
  [AssetType.INDEX]: 'Índice',
  [AssetType.COMMODITY]: 'Commodity',
  [AssetType.FUTURE]: 'Futuro',
  [AssetType.ACAO_BR]: 'Ação BR',
  [AssetType.ACAO_US]: 'Ação US',
  [AssetType.BDR]: 'BDR',
};

export interface HistoricalDataPoint { // Renamed from PriceTick
  time: number; // Unix timestamp (seconds)
  value: number;
  volume?: number; // Added volume
}

export interface AIOpinion {
  // trend: string; // REMOVED
  recommendation: NewsClassification;
  reasoning: string;
  isLoading: boolean;
  error?: string;
}

export interface Asset {
  id: string;
  name: string;
  symbol?: string;
  type: AssetType;
  price: number;
  change: number;
  changePercent: number;
  news: NewsItem[];
  historicalData: HistoricalDataPoint[];
  aiOpinion?: AIOpinion;
}

// Type for the expected JSON structure from Gemini for initial asset data
export interface GeminiStockDataResponse {
  price: number;
  news: Array<{ // News items no longer have individual classification
    title: string;
    summary: string;
    // classification: string; // REMOVED
  }>;
  symbol?: string;
}

// Type for the expected JSON structure from Gemini for AI Opinion
export interface GeminiAIOpinionResponse {
  // trend: string; // REMOVED
  recommendation: string; // "BUY", "SELL", or "HOLD"
  reasoning: string;
}

// Type for Gemini response when fetching only news
export interface GeminiNewsOnlyResponse {
  news: Array<{
    title: string;
    summary: string;
  }>;
}


export const NewsClassificationDisplayNames: Record<NewsClassification, string> = {
  [NewsClassification.BUY]: 'COMPRAR',
  [NewsClassification.HOLD]: 'MANTER',
  [NewsClassification.SELL]: 'VENDER',
};
