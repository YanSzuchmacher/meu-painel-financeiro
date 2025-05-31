
import React from 'react';
import { NewsItem } from '../types'; // NewsClassification and NewsClassificationDisplayNames are removed

interface NewsItemDisplayProps {
  newsItem: NewsItem;
}

const NewsItemDisplay: React.FC<NewsItemDisplayProps> = ({ newsItem }) => {
  // getClassificationClasses and classificationText are removed

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return ''; // Fallback for invalid date string
    }
  };
  
  return (
    <div className="p-3 border border-gray-700 rounded-lg mb-3 bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-1.5">
        <h4 className="text-md font-semibold text-sky-400 flex-grow pr-2">{newsItem.title}</h4>
        {/* Classification badge removed from here */}
      </div>
      <p className="text-sm text-gray-300 mb-1.5">{newsItem.summary}</p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{newsItem.source || 'N/A'} {formatDate(newsItem.publishedAt) && ` - ${formatDate(newsItem.publishedAt)}`}</span>
        {newsItem.url && (
          <a
            href={newsItem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 hover:underline"
          >
            Ler mais &rarr;
          </a>
        )}
      </div>
    </div>
  );
};

export default NewsItemDisplay;
