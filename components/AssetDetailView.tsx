
import React from 'react';
import { Asset, NewsClassification, AssetType, HistoricalDataPoint, NewsClassificationDisplayNames } from '../types'; // PriceTick renamed
import NewsItemDisplay from './NewsItemDisplay';
import PriceChart from './PriceChart';
import { SpinnerIcon } from './icons'; 

interface AssetDetailViewProps {
  asset: Asset;
  onAnalyzeAsset: (assetId: string) => void; // Changed from onAskAI
}

const AssetDetailView: React.FC<AssetDetailViewProps> = ({ asset, onAnalyzeAsset }) => {
  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };
  
  const formatPrice = (price: number, type: AssetType = asset.type) => {
     if (typeof price !== 'number' || !isFinite(price)) price = 0; 
     const minFractionDigits = (type === AssetType.FOREX || (type === AssetType.CRYPTO && price < 1)) ? 4 : 2;
     const maxFractionDigits = (type === AssetType.FOREX || (type === AssetType.CRYPTO && price < 1)) ? 4 : 2;
     // Using BRL as a placeholder for currency formatting.
     // The .replace might be specific if you always want '$' instead of 'R$'
     return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: minFractionDigits, maximumFractionDigits: maxFractionDigits }).replace("R$", "$");
  };

  const getRecommendationColor = (reco?: NewsClassification) => {
    if (!reco) return 'bg-gray-600 text-gray-200';
    switch (reco) {
      case NewsClassification.BUY: return 'bg-green-600 text-white';
      case NewsClassification.SELL: return 'bg-red-600 text-white';
      case NewsClassification.HOLD: return 'bg-yellow-500 text-gray-900';
      default: return 'bg-gray-600 text-gray-200';
    }
  };
  
  const currentPrice = (typeof asset.price === 'number' && isFinite(asset.price)) ? asset.price : 0;
  let previousPriceForDisplay = currentPrice;

  const validHistoricalData = Array.isArray(asset.historicalData) ? asset.historicalData.filter(point => typeof point.value === 'number' && isFinite(point.value)) : [];

  if (validHistoricalData.length > 1) {
    previousPriceForDisplay = validHistoricalData[validHistoricalData.length - 2].value;
  } else if (validHistoricalData.length === 1) {
    previousPriceForDisplay = currentPrice - (typeof asset.change === 'number' && isFinite(asset.change) ? asset.change : 0);
  }

  const changeValue = currentPrice - previousPriceForDisplay;
  const changePercentValue = previousPriceForDisplay !== 0 ? (changeValue / previousPriceForDisplay) * 100 : 0;

  return (
    <div className="bg-gray-800 shadow-xl rounded-lg p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-400">{asset.name} ({asset.symbol})</h2>
          <p className="text-sm text-gray-400">{asset.type}</p>
        </div>
        <div className="text-left sm:text-right mt-2 sm:mt-0">
          <p className={`text-3xl font-semibold ${getPriceChangeColor(changeValue)}`}>
            {formatPrice(currentPrice)}
          </p>
          <p className={`text-md ${getPriceChangeColor(changeValue)}`}>
            {changeValue >= 0 ? '+' : ''}{formatPrice(changeValue, asset.type)} ({changePercentValue >= 0 ? '+' : ''}{changePercentValue.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-200 mb-3">Histórico de Preços e Indicadores</h3>
        <div className="chart-container bg-gray-850 p-2 rounded-md shadow-inner">
          {asset.historicalData && asset.historicalData.length > 1 ? (
            <PriceChart data={asset.historicalData} assetType={asset.type} />
          ) : (
            <p className="text-center text-gray-500 py-10">Dados históricos insuficientes para o gráfico.</p>
          )}
        </div>
      </div>

      <div className="bg-gray-750 p-4 rounded-lg shadow">
         <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-semibold text-gray-200">Análise do Ativo (IA)</h3>
            <button
              onClick={() => onAnalyzeAsset(asset.id)} // Changed
              disabled={asset.aiOpinion?.isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-md shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center"
              aria-label="Analisar Ativo com IA"
            >
              {asset.aiOpinion?.isLoading ? (
                <SpinnerIcon className="mr-2 h-5 w-5" /> 
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.893-9.753a12.061 12.061 0 0 0-3.75 0m3.75 0a12.061 12.061 0 0 1 3.75 0M12.75 9.75h.008v.008h-.008V9.75Zm-.75 0h.008v.008h-.008V9.75Zm.375 0h.008v.008h-.008V9.75Zmd.75 3.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm.375-6.75h.008v.008h-.008V9.75Zm-.75 3.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm.375-6.75h.008v.008h-.008V9.75Zm-.75 3.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Z" />
                </svg>
              )}
              {asset.aiOpinion?.isLoading ? 'Analisando...' : 'Analisar Ativo'}
            </button>
        </div>
        {asset.aiOpinion?.isLoading && !asset.aiOpinion.reasoning && (
          <p className="text-gray-400 italic">Buscando notícias e insights da IA para {asset.name}...</p>
        )}
        {asset.aiOpinion?.error && (
          <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">Erro da IA: {asset.aiOpinion.error}</p>
        )}
        {asset.aiOpinion && !asset.aiOpinion.isLoading && asset.aiOpinion.reasoning && (
          <div className="space-y-3">
            <div className="flex items-baseline">
              <p className="text-gray-300 font-semibold mr-2">Recomendação:</p>
              <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${getRecommendationColor(asset.aiOpinion.recommendation)}`}>
                {NewsClassificationDisplayNames[asset.aiOpinion.recommendation] || asset.aiOpinion.recommendation}
              </span>
            </div>
            {/* Trend display removed */}
            <div>
              <p className="text-gray-300 font-semibold">Justificativa da IA:</p>
              <p className="text-gray-400 text-sm">{asset.aiOpinion.reasoning}</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-200 mb-3">Notícias Recentes do Ativo</h3>
        {asset.news && asset.news.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2"> {/* Ensure scroll for news */}
            {asset.news.map((newsItem) => (
              <NewsItemDisplay key={newsItem.id} newsItem={newsItem} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma notícia recente disponível para este ativo ou após a última análise.</p>
        )}
      </div>
    </div>
  );
};

export default AssetDetailView;
