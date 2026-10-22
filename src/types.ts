export type Mode = 'catalog' | 'demo' | 'real' | 'historical';
export type Category = 'all' | 'memory' | 'gpu' | 'cpu' | 'storage';
export type Interval = 'day' | 'week' | 'month';
export type ProductProfile = {
  kind: string;
  tierRank: number;
  series: string;
  fields: {key: string; label: string; value: string}[];
  facets: {capacityGb?: number; rateMt?: number; sticks?: number; gpuClass?: 'consumer' | 'professional'; vramGb?: number};
  analysis: {
    summary: string;
    idealFor: string[];
    tradeoffs: string[];
    comparisons: {productId: string; note: string}[];
    references: {label: string; url: string}[];
  };
};
export type Product = {
  id: string; category: Exclude<Category, 'all'>; brand: string;
  name: string; spec: string; releaseDate: string | null;
  currentPrice: number | null; previousPrice: number | null;
  changePercent: number | null; lowPrice: number | null; lowDate: string | null;
  source: string | null; updatedAt: string | null; observationCount: number;
  profile?: ProductProfile;
  dataMode?: Mode;
  historical?: {quoteType: 'promotion' | 'reported_listing'; platform: string; sku: string | null; sourceUrl: string; conditions: string};
};
export type Summary = {
  productCount: number; observationCount: number; recordedDays: number;
  earliestDate: string | null; latestDate: string | null; sourceCount: number;
};
export type Source = { name: string; observationCount: number; latestDate: string };
export type Dashboard = { mode: Mode; products: Product[]; summary: Summary; sources: Source[] };
export type PricePoint = { date: string; open: number; high: number; low: number; close: number; count: number };
export type History = {
  points: PricePoint[]; daily: {date: string; price: number; source: string}[];
  coverage: {expectedDays: number; observedDays: number; missingDays: number; earliestDate: string | null; latestDate: string | null};
  lowPrice: number | null; lowDate: string | null;
};
export type Offer = { source: string; price: number; date: string; url?: string };
export type CollectorStatus = {
  collector: {configured: boolean; running: boolean; schedule: string; lastRunAt: string | null; lastStatus: string | null; lastError: string | null};
  real: Summary; demo: Summary; historyStart: string; timezone: string;
};
