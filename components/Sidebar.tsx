
import React from 'react';
import { Asset, AssetType, AssetTypeDisplayNames } from '../types';
import { TrashIcon, SpinnerIcon } from './icons';

interface SidebarProps {
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  isInitialLoading?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  onDeleteAsset,
  isInitialLoading
}) => {
  const groupedAssets = assets.reduce((acc, asset) => {
    const type = asset.type || AssetType.STOCK; 
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(asset);
    return acc;
  }, {} as Record<AssetType, Asset[]>);

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const formatPrice = (price: number, type: AssetType) => {
    if (typeof price !== 'number' || !isFinite(price)) price = 0;
    const minFractionDigits = (type === AssetType.FOREX || (type === AssetType.CRYPTO && price < 1)) ? 4 : 2;
    const maxFractionDigits = (type === AssetType.FOREX || (type === AssetType.CRYPTO && price < 1)) ? 4 : 2;
    // Using BRL as a placeholder, actual currency depends on asset
    // For display, just showing $ sign for simplicity without full currency logic per asset
    return price.toLocaleString('pt-BR', { minimumFractionDigits: minFractionDigits, maximumFractionDigits: maxFractionDigits });
  };
  
  const formatChangePercent = (percent: number) => {
    if (typeof percent !== 'number' || !isFinite(percent)) percent = 0;
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2).replace('.',',')}%`;
  };


  return (
    <aside className="w-full md:w-72 lg:w-80 bg-gray-800 p-4 border-r border-gray-700 flex-shrink-0 md:h-screen md:overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-200 mb-4">Portfólio de Ativos</h2>
      {isInitialLoading && assets.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <SpinnerIcon className="h-6 w-6 text-sky-400 mr-2" />
          <span className="text-gray-400">Carregando ativos...</span>
        </div>
      )}
      {!isInitialLoading && assets.length === 0 && (
         <p className="text-sm text-gray-500 text-center py-4">Nenhum ativo no portfólio. Adicione um para começar.</p>
      )}

      {Object.entries(groupedAssets).sort(([typeA], [typeB]) => (AssetTypeDisplayNames[typeA as AssetType] || typeA).localeCompare(AssetTypeDisplayNames[typeB as AssetType] || typeB)).map(([type, typeAssets]) => (
        <div key={type} className="mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{AssetTypeDisplayNames[type as AssetType] || type}</h3>
          <ul className="space-y-1">
            {typeAssets.sort((a,b) => a.name.localeCompare(b.name)).map((asset) => (
              <li key={asset.id}>
                <button
                  onClick={() => onSelectAsset(asset.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-md text-left transition-all duration-150 ease-in-out
                    ${selectedAssetId === asset.id ? 'bg-sky-600 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                  aria-pressed={selectedAssetId === asset.id}
                >
                  <div className="flex-grow overflow-hidden pr-2">
                    <span className="font-semibold block truncate text-sm">{asset.name}</span>
                    <span className={`text-xs ${selectedAssetId === asset.id ? 'text-sky-200' : 'text-gray-400'}`}>
                        {asset.symbol || AssetTypeDisplayNames[asset.type] || asset.type}
                    </span>
                  </div>
                  <div className="text-right ml-1 flex-shrink-0">
                     <span className={`block text-sm font-medium ${selectedAssetId === asset.id ? 'text-white' : getPriceChangeColor(asset.change)}`}>
                        ${formatPrice(asset.price, asset.type)}
                     </span>
                     <span className={`block text-xs ${selectedAssetId === asset.id ? 'text-sky-200' : getPriceChangeColor(asset.change)}`}>
                        {formatChangePercent(asset.changePercent)}
                     </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); 
                      onDeleteAsset(asset.id);
                    }}
                    className={`ml-2 p-1.5 rounded-full transition-colors duration-150 flex-shrink-0 
                      ${selectedAssetId === asset.id ? 'text-sky-200 hover:text-white hover:bg-sky-500' : 'text-gray-500 hover:text-red-400 hover:bg-gray-600'}`}
                    aria-label={`Excluir ${asset.name}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
