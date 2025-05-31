
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Asset, AssetType, HistoricalDataPoint, NewsClassification, AIOpinion } from './types'; // PriceTick renamed to HistoricalDataPoint
import { generateInitialAssetData, getAIOpinionForAsset, generateInitialHistoricalData, getLatestNewsForAsset } from './services/geminiService';
import AssetForm from './components/AssetForm';
import Sidebar from './components/Sidebar';
import AssetDetailView from './components/AssetDetailView';
import { SpinnerIcon } from './components/icons';
import { PREDEFINED_ASSETS_CONFIG, PRICE_SIMULATION_INTERVAL, MAX_PRICE_CHANGE_PERCENT, MOCK_HISTORICAL_DATA_POINTS } from './constants';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isLoadingNewAsset, setIsLoadingNewAsset] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isValidHistoricalDataPoint = (point: HistoricalDataPoint): point is HistoricalDataPoint => 
    typeof point === 'object' && point !== null &&
    typeof point.time === 'number' && isFinite(point.time) &&
    typeof point.value === 'number' && isFinite(point.value) &&
    (typeof point.volume === 'number' ? isFinite(point.volume) : true); // Volume is optional but must be finite if present

  const loadInitialAssets = useCallback(async () => {
    setError(null);
    try {
      const storedAssetsString = localStorage.getItem('financialDashboardAssets');
      if (storedAssetsString) {
        const parsedAssets = JSON.parse(storedAssetsString) as Asset[];
        if (Array.isArray(parsedAssets) && parsedAssets.length > 0 && parsedAssets.every(a => a.id && a.name)) {
          setAssets(parsedAssets.map(asset => ({
            ...asset,
            price: (typeof asset.price === 'number' && isFinite(asset.price)) ? asset.price : 50,
            historicalData: Array.isArray(asset.historicalData) 
                            ? asset.historicalData.filter(isValidHistoricalDataPoint) 
                            : generateInitialHistoricalData( (typeof asset.price === 'number' && isFinite(asset.price)) ? asset.price : 50, MOCK_HISTORICAL_DATA_POINTS),
            aiOpinion: asset.aiOpinion ? { ...asset.aiOpinion, isLoading: false, error: undefined } : { recommendation: NewsClassification.HOLD, reasoning: '', isLoading: false }
          })));
          setIsInitialLoading(false);
          return;
        } else {
          localStorage.removeItem('financialDashboardAssets');
        }
      }

      console.log("Loading predefined assets.");
      const initialAssetsBatch: Asset[] = [];
      for (const config of PREDEFINED_ASSETS_CONFIG) {
        try {
          const assetData = await generateInitialAssetData(config.name, config.type);
          const newAsset: Asset = {
            id: `${config.symbol || config.name.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: config.name,
            symbol: config.symbol || assetData.symbol || config.name,
            type: config.type,
            price: (typeof assetData.price === 'number' && isFinite(assetData.price) && assetData.price > 0) ? assetData.price : 50,
            news: assetData.news || [], // News items no longer have classification here
            change: 0,
            changePercent: 0,
            historicalData: Array.isArray(assetData.historicalData) ? assetData.historicalData.filter(isValidHistoricalDataPoint) : generateInitialHistoricalData(50, MOCK_HISTORICAL_DATA_POINTS),
            aiOpinion: {
              recommendation: NewsClassification.HOLD, reasoning: '', isLoading: false
            }
          };
          initialAssetsBatch.push(newAsset);
        } catch (e) {
          console.error(`Error fetching predefined asset ${config.name}:`, e);
          setError(prev => `${prev || ''} Falha ao carregar ${config.name}. `);
        }
      }
      setAssets(initialAssetsBatch);
    } catch (e) {
      console.error("Failed to load initial data:", e);
      setError("Não foi possível carregar os dados.");
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialAssets();
  }, [loadInitialAssets]);

  useEffect(() => {
    if (!isInitialLoading && assets.length > 0 && !selectedAssetId) {
      const firstValidAsset = assets.find(a => typeof a.id === 'string');
      if (firstValidAsset) {
        setSelectedAssetId(firstValidAsset.id);
      }
    }
  }, [assets, isInitialLoading, selectedAssetId]);

  useEffect(() => {
    if (!isInitialLoading && assets.length > 0) {
      try {
        localStorage.setItem('financialDashboardAssets', JSON.stringify(assets));
      } catch (e) {
        console.error("Failed to save assets to local storage:", e);
      }
    }
  }, [assets, isInitialLoading]);

  useEffect(() => {
    if (isInitialLoading || assets.length === 0) return;

    const intervalId = setInterval(() => {
      setAssets(prevAssets =>
        prevAssets.map(asset => {
          if (typeof asset.price !== 'number' || !isFinite(asset.price) || asset.price <=0) {
            return asset;
          }
          const prevPrice = asset.price;
          const priceChangePercent = (Math.random() - 0.5) * 2 * (MAX_PRICE_CHANGE_PERCENT / 100);
          const priceChangeValue = prevPrice * priceChangePercent;
          let newPriceCandidate = prevPrice + priceChangeValue;
          if (isNaN(newPriceCandidate) || !isFinite(newPriceCandidate) || newPriceCandidate <= 0) {
            newPriceCandidate = prevPrice; 
          }
          let newPrice = parseFloat(newPriceCandidate.toFixed(asset.type === AssetType.FOREX || (asset.type === AssetType.CRYPTO && prevPrice < 1) ? 4 : 2));
          if (isNaN(newPrice) || !isFinite(newPrice) || newPrice <= 0) {
            newPrice = prevPrice; 
          }
          newPrice = Math.max(0.0001, newPrice);

          const baseVolume = asset.historicalData[asset.historicalData.length -1]?.volume || (1000 + Math.random() * 9000);
          const simulatedVolume = Math.floor(baseVolume * (0.8 + Math.random() * 0.4)); // +/- 20% of previous volume

          const newPoint: HistoricalDataPoint = { time: Math.floor(Date.now() / 1000), value: newPrice, volume: simulatedVolume };
          
          const currentHistoricalData = Array.isArray(asset.historicalData) ? asset.historicalData.filter(isValidHistoricalDataPoint) : [];
          const updatedHistoricalData = [...currentHistoricalData.slice(-MOCK_HISTORICAL_DATA_POINTS + 1), newPoint];
          
          const lastValidHistoricalValue = currentHistoricalData.length > 0 ? currentHistoricalData[currentHistoricalData.length -1].value : prevPrice;
          const calculatedChange = newPrice - lastValidHistoricalValue;
          const calculatedChangePercent = lastValidHistoricalValue !== 0 ? (calculatedChange / lastValidHistoricalValue) * 100 : 0;

          return {
            ...asset,
            price: newPrice,
            change: (isNaN(calculatedChange) || !isFinite(calculatedChange)) ? 0 : calculatedChange,
            changePercent: (isNaN(calculatedChangePercent) || !isFinite(calculatedChangePercent)) ? 0 : calculatedChangePercent,
            historicalData: updatedHistoricalData,
          };
        })
      );
    }, PRICE_SIMULATION_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isInitialLoading, assets]);

  const handleAddAsset = useCallback(async (assetName: string, assetType: AssetType) => {
    setIsLoadingNewAsset(true);
    setError(null);
    try {
      if (assets.some(asset => asset.name.toLowerCase() === assetName.toLowerCase() || (asset.symbol && asset.symbol.toLowerCase() === assetName.toLowerCase()))) {
        setError(`Ativo "${assetName}" já está na sua lista.`);
        setIsLoadingNewAsset(false);
        return;
      }
      const assetData = await generateInitialAssetData(assetName, assetType);
      const newAsset: Asset = {
        id: `${assetName.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: assetName,
        symbol: assetData.symbol || assetName,
        type: assetType,
        price: (typeof assetData.price === 'number' && isFinite(assetData.price) && assetData.price > 0) ? assetData.price : 50,
        news: assetData.news || [],
        change: 0,
        changePercent: 0,
        historicalData: Array.isArray(assetData.historicalData) ? assetData.historicalData.filter(isValidHistoricalDataPoint) : generateInitialHistoricalData(50, MOCK_HISTORICAL_DATA_POINTS),
        aiOpinion: {
          recommendation: NewsClassification.HOLD, reasoning: '', isLoading: false
        }
      };
      setAssets(prevAssets => [newAsset, ...prevAssets]);
      setSelectedAssetId(newAsset.id);
    } catch (e) {
      console.error("Error adding asset:", e);
      setError(e instanceof Error ? e.message : "Ocorreu um erro desconhecido ao adicionar o ativo.");
    } finally {
      setIsLoadingNewAsset(false);
    }
  }, [assets]);

  const handleDeleteAsset = useCallback((assetIdToDelete: string) => {
    setAssets(prevAssets => {
        const updatedAssets = prevAssets.filter(asset => asset.id !== assetIdToDelete);
        if (selectedAssetId === assetIdToDelete) {
            setSelectedAssetId(updatedAssets.length > 0 ? updatedAssets[0].id : null);
        }
        return updatedAssets;
    });
    setError(null); 
  }, [selectedAssetId]);

  const handleAnalyzeAsset = useCallback(async (assetId: string) => {
    const assetToUpdate = assets.find(a => a.id === assetId);
    if (!assetToUpdate) return;

    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiOpinion: { ...(a.aiOpinion || { recommendation: NewsClassification.HOLD, reasoning: ''}), isLoading: true, error: undefined } } : a));
    
    try {
      // 1. Fetch latest news
      const latestNews = await getLatestNewsForAsset(assetToUpdate.name, assetToUpdate.type);
      
      // Update asset with new news FIRST, so AI opinion uses them
      let updatedAssetWithNews = { ...assetToUpdate, news: latestNews };
      setAssets(prev => prev.map(a => a.id === assetId ? updatedAssetWithNews : a));

      // 2. Get AI opinion based on the asset with new news
      const opinionData = await getAIOpinionForAsset(updatedAssetWithNews);
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, news: latestNews, aiOpinion: { ...opinionData, isLoading: false } } : a));

    } catch (e) {
      console.error(`Error analyzing asset ${assetToUpdate.name}:`, e);
      const errorMessage = e instanceof Error ? e.message : "Erro desconhecido na IA.";
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiOpinion: { ...(a.aiOpinion || { recommendation: NewsClassification.HOLD, reasoning: ''}), isLoading: false, error: errorMessage } } : a));
    }
  }, [assets]);

  const selectedAsset = useMemo(() => assets.find(asset => asset.id === selectedAssetId), [assets, selectedAssetId]);

  if (isInitialLoading && assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-4">
        <SpinnerIcon className="h-12 w-12 text-sky-500" />
        <p className="mt-4 text-xl text-gray-300">Carregando Painel Financeiro...</p>
        <p className="text-sm text-gray-500 mt-1">Inicializando ativos e simulação de dados de mercado.</p>
      </div>
    );
  }
  
  const assetsAvailable = assets.length > 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-gray-100">
      <Sidebar
        assets={assets}
        selectedAssetId={selectedAssetId}
        onSelectAsset={setSelectedAssetId}
        onDeleteAsset={handleDeleteAsset}
        isInitialLoading={isInitialLoading && !assetsAvailable}
      />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
            Painel Financeiro Dinâmico
          </h1>
        </header>
        
        <AssetForm onAddAsset={handleAddAsset} isLoading={isLoadingNewAsset} />

        {error && (
          <div className="mb-4 p-3 bg-red-800 border border-red-700 text-red-100 rounded-md shadow-md" role="alert">
            <strong className="font-semibold">Erro:</strong>
            <span className="ml-2">{error}</span>
          </div>
        )}

        {selectedAsset ? (
          <AssetDetailView
            asset={selectedAsset}
            onAnalyzeAsset={handleAnalyzeAsset} // Changed from onAskAI
          />
        ) : (
          <div className="text-center py-10">
            { isInitialLoading && !assetsAvailable ? 
                <SpinnerIcon className="mx-auto h-10 w-10 text-sky-400" /> :
                 !assetsAvailable && !isInitialLoading ? 
                 <p className="text-gray-500 text-lg">Nenhum ativo adicionado. Adicione um usando o formulário acima.</p> :
                 <p className="text-gray-500 text-lg">Selecione um ativo na barra lateral para ver os detalhes.</p>
            }
          </div>
        )}
        <footer className="mt-10 text-center text-gray-500 text-xs">
          <p>&copy; {new Date().getFullYear()} Painel Financeiro. Preços simulados. Opiniões de IA para demonstração.</p>
          <p>Configure API_KEY para recursos Gemini. Dados em tempo real requerem APIs financeiras dedicadas.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
