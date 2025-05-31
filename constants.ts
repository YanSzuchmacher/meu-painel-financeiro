
import { AssetType } from './types';

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

// Updated to include a comprehensive list of assets based on user-provided images
export const PREDEFINED_ASSETS_CONFIG: Array<{ name: string, type: AssetType, symbol?: string }> = [
  // INDICES (from image, SPX is US, others are BR or BDRs of foreign ETFs)
  { name: "IBOV", type: AssetType.INDEX, symbol: "IBOV" },
  { name: "IVVB11 (S&P 500 ETF BDR)", type: AssetType.BDR, symbol: "IVVB11" },
  { name: "BIWM3 (Small Cap ETF BDR)", type: AssetType.BDR, symbol: "BIWM3" }, // Assuming BDR of an ETF
  { name: "SPXI11 (S&P 500 ETF BDR)", type: AssetType.BDR, symbol: "SPXI11" },
  { name: "S&P 500", type: AssetType.INDEX, symbol: "SPX" },

  // STOCKS (from image, categorized into BDR, ACAO_BR, ACAO_US)
  // BDRs
  { name: "ExxonMobil (BDR)", type: AssetType.BDR, symbol: "EXXO3" },
  { name: "McDonald's (BDR)", type: AssetType.BDR, symbol: "MCDC3" },
  { name: "Amazon (BDR)", type: AssetType.BDR, symbol: "AMZO3" },
  { name: "Microsoft (BDR)", type: AssetType.BDR, symbol: "MSFT3" },
  { name: "Bristol Myers (BDR)", type: AssetType.BDR, symbol: "BMYB3" },
  { name: "Adobe (BDR)", type: AssetType.BDR, symbol: "ADBE3" },
  { name: "ConocoPhillips (BDR)", type: AssetType.BDR, symbol: "COPH3" },
  { name: "Salesforce (BDR)", type: AssetType.BDR, symbol: "SSFO3" },
  
  // Ações BR
  { name: "Embraer ON", type: AssetType.ACAO_BR, symbol: "EMBR3" },
  { name: "Petrobras PN", type: AssetType.ACAO_BR, symbol: "PETR4" },
  { name: "Itaú Unibanco PN", type: AssetType.ACAO_BR, symbol: "ITUB3" },
  { name: "Vale ON", type: AssetType.ACAO_BR, symbol: "VALE3" },
  { name: "Petz ON", type: AssetType.ACAO_BR, symbol: "PETZ3" },
  { name: "Light ON", type: AssetType.ACAO_BR, symbol: "LIGT3" },

  // Ações US (based on image tickers without BDR suffixes)
  { name: "Apple Inc.", type: AssetType.ACAO_US, symbol: "AAPL" },
  { name: "Tesla Inc.", type: AssetType.ACAO_US, symbol: "TSLA" },
  { name: "Netflix Inc.", type: AssetType.ACAO_US, symbol: "NFLX" },

  // FUTURES (from image)
  { name: "Crude Oil (WTI Future)", type: AssetType.FUTURE, symbol: "USOIL" },
  { name: "Mini Gold Future", type: AssetType.FUTURE, symbol: "GOLD1D" }, // Symbol from image: GOLD1 D
  { name: "Gold Future", type: AssetType.FUTURE, symbol: "GOLD" }, // Symbol from image
  { name: "Silver Future", type: AssetType.FUTURE, symbol: "SILVER" }, // Symbol from image
  
  // FOREX (from image)
  { name: "USD/BRL", type: AssetType.FOREX, symbol: "USDBRL" },
  { name: "EUR/BRL", type: AssetType.FOREX, symbol: "EURBRL" },
  { name: "EUR/USD", type: AssetType.FOREX, symbol: "EURUSD" },
  { name: "GBP/USD", type: AssetType.FOREX, symbol: "GBPUSD" },
  { name: "USD/JPY", type: AssetType.FOREX, symbol: "USDJPY" },

  // CRYPTO (from image)
  { name: "Bitcoin/USD", type: AssetType.CRYPTO, symbol: "BTCUSD" },
  { name: "Ripple/USD", type: AssetType.CRYPTO, symbol: "XRPUSD" },
  { name: "Chainlink/USD", type: AssetType.CRYPTO, symbol: "LINKUSD" },
];

export const MOCK_HISTORICAL_DATA_POINTS = 50; // Number of historical points to generate for chart
export const PRICE_SIMULATION_INTERVAL = 3000; // Update prices every 3 seconds
export const MAX_PRICE_CHANGE_PERCENT = 0.5; // Max % change for simulation
