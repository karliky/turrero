import React from 'react';

interface Tweet {
  id: string;
  time: string;
  summary: string;
  stats: { retweets: string; quotetweets: string; likes: string };
  engagement: number;
}

function formatRelativeTime(dateString: string, fullText: boolean = false): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 7) {
    return fullText 
      ? `${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`
      : `${diffInDays}d`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return fullText 
      ? `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
      : `${weeks}s`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return fullText 
      ? `${months} ${months === 1 ? 'mes' : 'meses'}`
      : `${months}m`;
  } else {
    const years = Math.floor(diffInDays / 365);
    const remainingDays = diffInDays % 365;
    const remainingMonths = Math.floor(remainingDays / 30);

    if (fullText) {
      let result = `${years} ${years === 1 ? 'año' : 'años'}`;
      if (remainingMonths > 0) {
        result += ` y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
      }
      return result;
    }
    
    return `${years}a`;
  }
}

interface CategoryCardProps {
  category: string;
  tweets: Tweet[];
  formatCategoryTitle: (category: string) => string;
}

function formatCategoryUrl(category: string): string {
  return String(category)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function CategoryCard({ category, tweets, formatCategoryTitle }: CategoryCardProps) {
  const isTop25 = category === 'top-25-turras';
  const isLasMasNuevas = category === 'las-más-nuevas';
  const isOtrosAutores = category === 'otros-autores'; // en algun momento se puede poner una página de otros autores
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow duration-300 flex flex-col min-h-[400px] group">
      <h2 className="text-xl font-bold mb-3 text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
        { (isTop25 ||isLasMasNuevas || isOtrosAutores)? (
          formatCategoryTitle(category)
        ) : (
          <a href={`/${formatCategoryUrl(category)}`} className="hover:underline">
            {formatCategoryTitle(category)}
          </a>
        )}
      </h2>

      <div className="relative flex-1 min-h-0">
        <div 
          className="absolute inset-0 space-y-0.5 overflow-y-auto pr-2 no-scrollbar" 
          style={{ 
            msOverflowStyle: 'none',  /* IE and Edge */
            scrollbarWidth: 'none'    /* Firefox */
          }}
        >
          {tweets.map((item) => (
            <div
              key={item.id}
              className="py-1 px-2 rounded-md flex items-baseline gap-2 hover:bg-whiskey-50 transition-colors"
            >
              <div className="hs-tooltip inline-block shrink-0">
                <span className="hs-tooltip-toggle text-whiskey-500 text-xs whitespace-nowrap border-b border-dotted border-whiskey-300 cursor-help hover:text-whiskey-600 transition-colors">
                  {formatRelativeTime(item.time)}
                  <span
                    className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-2 px-3 bg-gray-900 text-xs font-medium text-white rounded-md shadow-lg dark:bg-neutral-700 max-w-xs"
                    role="tooltip"
                  >
                    {(isTop25|| isLasMasNuevas || isOtrosAutores)
                      ? `Turra publicada hace ${formatRelativeTime(item.time, true)}. (${item.stats.likes} likes, ${item.stats.retweets} retweets, ${item.stats.quotetweets} quotetweets)`
                      : `Turra publicada hace ${formatRelativeTime(item.time, true)}`
                    }
                  </span>
                </span>
              </div>
              <a
                href={`/turra/${item.id}`}
                className="text-gray-700 hover:text-whiskey-900 text-sm transition-colors duration-200 hover:underline line-clamp-2"
              >
                {item.summary}
              </a>
            </div>
          ))}
        </div>
      </div>

      {!(isTop25 ||isLasMasNuevas || isOtrosAutores) && (
        <div className="pt-3 mt-2 border-t border-whiskey-100">
          <a
            href={`/${formatCategoryUrl(category)}`}
            className="inline-flex items-center text-whiskey-600 hover:text-whiskey-800 text-sm font-medium group-hover:translate-x-1 transition-all duration-200"
          >
            Ver más <span className="ml-1.5">→</span>
          </a>
        </div>
      )}
      
    </div>
  );
} 