
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT, MOCK_HISTORICAL_DATA_POINTS } from '../constants';
import { NewsClassification, NewsItem, GeminiStockDataResponse, Asset, HistoricalDataPoint, GeminiAIOpinionResponse, AIOpinion, AssetType, GeminiNewsOnlyResponse } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not found. Using mock data for Gemini interactions.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY_FOR_GEMINI" });

// parseClassification is now only for the main AI recommendation
const parseRecommendation = (recommendationStr: string): NewsClassification => {
  const upperStr = recommendationStr.toUpperCase();
  if (upperStr === NewsClassification.BUY) return NewsClassification.BUY;
  if (upperStr === NewsClassification.HOLD) return NewsClassification.HOLD;
  if (upperStr === NewsClassification.SELL) return NewsClassification.SELL;
  
  if (upperStr === 'COMPRAR') return NewsClassification.BUY;
  if (upperStr === 'MANTER') return NewsClassification.HOLD;
  if (upperStr === 'VENDER') return NewsClassification.SELL;

  return NewsClassification.HOLD; // Default
};


export const generateInitialHistoricalData = (currentPrice: number, points: number): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  let price = currentPrice;
  if (isNaN(price) || !isFinite(price) || price <= 0) {
    price = 50 + Math.random() * 50;
  }

  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < points; i++) {
    const lastValidPriceForPoint = price;
    // Simulate volume: higher for price increases or significant drops, lower for stable prices
    const priceMovementFactor = Math.abs((Math.random() - 0.5) * 0.02); // +/- 2% potential change
    const baseVolume = 1000 + Math.random() * 9000; // Base volume
    const simulatedVolume = Math.floor(baseVolume * (1 + priceMovementFactor * 10)); // Amplify volume based on movement

    data.unshift({
      time: now - (points - 1 - i) * 3600,
      value: lastValidPriceForPoint,
      volume: simulatedVolume,
    });

    let newPriceCandidate = price * (1 + (Math.random() - 0.5) * 0.02); // up to 2% change
    
    if (isNaN(newPriceCandidate) || !isFinite(newPriceCandidate) || newPriceCandidate <= 0) {
        newPriceCandidate = price;
    }
    
    let nextPrice = parseFloat(newPriceCandidate.toFixed(4));
    if (isNaN(nextPrice) || !isFinite(nextPrice) || nextPrice <= 0) {
        nextPrice = price;
    }
    price = Math.max(0.0001, nextPrice);
  }
  return data.reverse();
};

export const generateInitialAssetData = async (assetName: string, assetType: AssetType): Promise<Partial<Pick<Asset, 'price' | 'news' | 'symbol' | 'historicalData'>>> => {
  if (!API_KEY) {
    console.warn(`API_KEY is missing. Returning mock data for ${assetName}.`);
    const mockPrice = Math.random() * 490 + 10;
    const cleanMockPrice = parseFloat(mockPrice.toFixed(assetType === AssetType.FOREX || (assetType === AssetType.CRYPTO && mockPrice < 1) ? 4 : 2));
    return {
      price: cleanMockPrice,
      news: [
        { id: `mock1-${Date.now()}`, title: `Notícia Mock 1 para ${assetName}`, summary: 'Este é um resumo mock. Chave API ausente.', source: 'Dados Mock', publishedAt: new Date().toISOString() },
        { id: `mock2-${Date.now()}`, title: `Notícia Mock 2 para ${assetName}`, summary: 'Outro resumo mock sobre o ativo.', source: 'Dados Mock', publishedAt: new Date().toISOString() },
        { id: `mock3-${Date.now()}`, title: `Notícia Mock 3 para ${assetName}`, summary: 'Terceiro resumo mock.', source: 'Dados Mock', publishedAt: new Date().toISOString() },
      ],
      historicalData: generateInitialHistoricalData(cleanMockPrice, MOCK_HISTORICAL_DATA_POINTS),
      symbol: assetName,
    };
  }
  
  const prompt = `
Provide fictional financial data for the asset "${assetName}" (type: ${assetType}).
The data should be in JSON format.
The JSON object must have the following exact structure:
{
  "price": number, // A realistic current price (e.g., for stocks 10.00-800.00, for crypto 0.01-70000.00, for forex 0.5-10.0, for commodities 20-3000), with 2-4 decimal places as appropriate for the asset type.
  "news": [ // An array of 3 fictional news items relevant to the asset. DO NOT include 'classification' for news items.
    {
      "title": "string", // A concise news headline.
      "summary": "string" // A brief summary of the news, 1-2 sentences.
    }
  ],
  "symbol": "string" // If applicable, provide a common stock/crypto symbol. If not, use the asset name.
}

Ensure the entire response is ONLY the JSON object, without any surrounding text, explanations, or markdown code fences like \`\`\`json or \`\`\`.
The price should be a number, not a string.
News items should only contain 'title' and 'summary'.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    });

    let jsonStr = (response.text ?? '').trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    const parsedData = JSON.parse(jsonStr) as GeminiStockDataResponse;

    if (typeof parsedData.price !== 'number' || !isFinite(parsedData.price) || !Array.isArray(parsedData.news) || parsedData.news.length === 0) {
      console.error("Malformed JSON from Gemini (initial data):", jsonStr);
      throw new Error("Invalid JSON structure, non-finite price, or empty news received from API for initial data.");
    }
    if (parsedData.news.some((item: any) => item.classification !== undefined)) {
      console.warn("Gemini API returned 'classification' in news items despite prompt. It will be ignored.");
    }


    const newsItems: NewsItem[] = parsedData.news.map((item, index) => ({
      id: `${assetName}-news-${Date.now()}-${index}`,
      title: item.title,
      summary: item.summary,
      // classification is removed
      source: 'Gerado por IA',
      publishedAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    }));
    
    let finalPrice = parseFloat(parsedData.price.toFixed(assetType === AssetType.FOREX || (assetType === AssetType.CRYPTO && parsedData.price < 1) ? 4 : 2));
    if (isNaN(finalPrice) || !isFinite(finalPrice) || finalPrice <=0) {
        finalPrice = 50 + Math.random() * 50; 
    }

    return {
      price: finalPrice,
      news: newsItems,
      symbol: parsedData.symbol || assetName,
      historicalData: generateInitialHistoricalData(finalPrice, MOCK_HISTORICAL_DATA_POINTS),
    };

  } catch (error) {
    console.error(`Error fetching initial data for ${assetName} from Gemini:`, error);
    if (error instanceof SyntaxError) {
        console.error("Raw JSON string that caused parsing error:", (error as any).sourceString || "Source string not available");
    }
    const fallbackPrice = 50 + Math.random() * 100;
    const cleanFallbackPrice = parseFloat(fallbackPrice.toFixed(assetType === AssetType.FOREX || (assetType === AssetType.CRYPTO && fallbackPrice < 1) ? 4 : 2));
    return { 
      price: cleanFallbackPrice,
      news: [{ 
          id: `err-news-${Date.now()}`, 
          title: 'Erro ao buscar notícias', 
          summary: error instanceof Error ? error.message : "Erro desconhecido ao buscar notícias",
          source: 'Sistema de Erro',
          publishedAt: new Date().toISOString(),
      }],
      symbol: assetName,
      historicalData: generateInitialHistoricalData(cleanFallbackPrice, MOCK_HISTORICAL_DATA_POINTS),
    };
  }
};

export const getLatestNewsForAsset = async (assetName: string, assetType: AssetType): Promise<NewsItem[]> => {
  if (!API_KEY) {
    console.warn(`API_KEY is missing. Returning mock news for ${assetName}.`);
    return [
      { id: `mock-latest-1-${Date.now()}`, title: `Nova Notícia Mock 1 para ${assetName}`, summary: 'Este é um novo resumo mock para análise.', source: 'Dados Mock', publishedAt: new Date().toISOString() },
      { id: `mock-latest-2-${Date.now()}`, title: `Nova Notícia Mock 2 para ${assetName}`, summary: 'Outro novo resumo mock sobre o ativo para análise.', source: 'Dados Mock', publishedAt: new Date().toISOString() },
    ];
  }

  const prompt = `
Provide 3 recent fictional news summaries for the financial asset "${assetName}" (type: ${assetType}).
The data should be in JSON format.
The JSON object must have the following exact structure:
{
  "news": [
    {
      "title": "string", // A concise news headline.
      "summary": "string" // A brief summary of the news, 1-2 sentences.
    }
  ]
}
Ensure the entire response is ONLY the JSON object, without any surrounding text, explanations, or markdown code fences.
News items should only contain 'title' and 'summary'. Do NOT include 'classification'.
`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });
    let jsonStr = (response.text ?? '').trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    const parsedData = JSON.parse(jsonStr) as GeminiNewsOnlyResponse;

    if (!Array.isArray(parsedData.news) || parsedData.news.some((item: any) => !item.title || !item.summary)) {
      console.error("Malformed JSON from Gemini (latest news):", jsonStr);
      throw new Error("Invalid JSON structure for latest news.");
    }
    
    return parsedData.news.map((item, index) => ({
      id: `${assetName}-latestnews-${Date.now()}-${index}`,
      title: item.title,
      summary: item.summary,
      source: 'Gerado por IA (Recente)',
      publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(), // News within last day
    }));

  } catch (error) {
    console.error(`Error fetching latest news for ${assetName} from Gemini:`, error);
    if (error instanceof SyntaxError) {
        console.error("Raw JSON string (latest news):", (error as any).sourceString || "N/A");
    }
    return [{ 
      id: `err-latestnews-${Date.now()}`, 
      title: 'Erro ao buscar últimas notícias', 
      summary: error instanceof Error ? error.message : "Erro desconhecido",
      source: 'Sistema de Erro',
      publishedAt: new Date().toISOString(),
    }];
  }
};


export const getAIOpinionForAsset = async (asset: Pick<Asset, 'name' | 'type' | 'price' | 'news'>): Promise<Pick<AIOpinion, 'recommendation' | 'reasoning'>> => {
  if (!API_KEY) {
    console.warn(`API_KEY is missing. Returning mock AI opinion for ${asset.name}.`);
    return {
      recommendation: NewsClassification.HOLD,
      reasoning: "Esta é uma opinião simulada da IA porque a chave da API para o Gemini não está configurada."
    };
  }

  // Use only the summaries of the most recent news for the prompt
  const recentNewsSummariesForPrompt = asset.news.slice(0, 3).map(n => `- ${n.summary}`).join('\n');

  const prompt = `
Analyze the financial asset "${asset.name}" (Type: ${asset.type}, Current Price: ${asset.price.toFixed(asset.type === AssetType.FOREX || (asset.type === AssetType.CRYPTO && asset.price < 1) ? 4 : 2)}).
Consider the following recent fictional news summaries:
${recentNewsSummariesForPrompt || "No specific news provided, base on general knowledge of this asset type."}

Provide your analysis in JSON format. The JSON object must have the following exact structure:
{
  "recommendation": "string", // Your investment recommendation: MUST be one of "BUY", "HOLD", or "SELL".
  "reasoning": "string" // A concise explanation for your recommendation (2-3 sentences).
}

Ensure the entire response is ONLY the JSON object, without any surrounding text, explanations, or markdown code fences.
The recommendation MUST be in English ("BUY", "SELL", "HOLD").
Do NOT include a "trend" field.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    let jsonStr = (response.text ?? '').trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiAIOpinionResponse;

    if (!parsedData.recommendation || !parsedData.reasoning || (parsedData as any).trend !== undefined) {
        console.error("Malformed JSON from Gemini (AI opinion):", jsonStr);
        throw new Error("Invalid JSON structure received from AI opinion API. Missing recommendation/reasoning or contains trend.");
    }

    return {
      recommendation: parseRecommendation(parsedData.recommendation),
      reasoning: parsedData.reasoning,
    };

  } catch (error) {
    console.error(`Error fetching AI opinion for ${asset.name} from Gemini:`, error);
    if (error instanceof SyntaxError) {
        console.error("Raw JSON string (AI opinion):", (error as any).sourceString || "N/A");
    }
    throw new Error(`Falha ao obter opinião da IA para ${asset.name}: ${error instanceof Error ? error.message : "Erro desconhecido na API"}`);
  }
};
