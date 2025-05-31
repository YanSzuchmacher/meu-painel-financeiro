
import React, { useState } from 'react';
import { PlusIcon, SpinnerIcon } from './icons';
import { AssetType, AssetTypeDisplayNames } from '../types';

interface AssetFormProps {
  onAddAsset: (assetName: string, assetType: AssetType) => Promise<void>;
  isLoading: boolean;
}

const AssetForm: React.FC<AssetFormProps> = ({ onAddAsset, isLoading }) => {
  const [assetName, setAssetName] = useState('');
  // Ensure default assetType is one of the enum keys, not display name
  const [assetType, setAssetType] = useState<AssetType>(AssetType.STOCK);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || isLoading) return;
    await onAddAsset(assetName.trim(), assetType);
    setAssetName(''); 
    // setAssetType(AssetType.STOCK); // Reset type if desired
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-4 sm:p-6 bg-gray-800 shadow-xl rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="sm:col-span-1">
          <label htmlFor="assetName" className="block text-sm font-medium text-gray-300 mb-1">
            Nome do Ativo
          </label>
          <input
            type="text"
            id="assetName"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="Ex: Apple, Bitcoin, IBOV"
            className="w-full px-3 py-2.5 border border-gray-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 bg-gray-700 text-gray-100 placeholder-gray-500 transition-colors"
            disabled={isLoading}
            aria-label="Nome do Ativo"
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="assetType" className="block text-sm font-medium text-gray-300 mb-1">
            Tipo do Ativo
          </label>
          <select
            id="assetType"
            value={assetType} // This should be the enum key
            onChange={(e) => setAssetType(e.target.value as AssetType)}
            className="w-full px-3 py-2.5 border border-gray-600 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 bg-gray-700 text-gray-100 transition-colors"
            disabled={isLoading}
            aria-label="Tipo do Ativo"
          >
            {Object.entries(AssetTypeDisplayNames).map(([key, displayName]) => (
              <option key={key} value={key as AssetType}>
                {displayName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading || !assetName.trim()}
          className="w-full sm:col-span-1 px-4 py-2.5 bg-sky-600 text-white font-semibold rounded-md shadow-md hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out flex items-center justify-center"
          aria-label="Adicionar Ativo"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="mr-2 h-5 w-5" />
              Buscando...
            </>
          ) : (
            <>
              <PlusIcon className="mr-2 h-5 w-5" />
              Adicionar Ativo
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default AssetForm;
