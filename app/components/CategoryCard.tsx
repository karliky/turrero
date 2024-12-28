interface Tweet {
  id: string;
  time: string;
  summary: string;
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
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow flex flex-col min-h-[400px]">
      <h2 className="text-lg font-bold mb-3 text-whiskey-900">
        {formatCategoryTitle(category)}
      </h2>
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 space-y-1 overflow-y-auto scrollbar-hide pr-2">
          {tweets.map((item) => (
            <div
              key={`${category}-${item.id}`}
              className="p-0 rounded-md flex items-baseline gap-2"
            >
              <div className="hs-tooltip inline-block">
                <span className="hs-tooltip-toggle text-whiskey-500 text-xs whitespace-nowrap border-b border-dotted border-whiskey-300 cursor-help">
                  {formatRelativeTime(item.time)}
                  <span
                    className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-gray-900 text-xs font-medium text-white rounded shadow-sm dark:bg-neutral-700"
                    role="tooltip"
                  >
                    Turra publicada hace {formatRelativeTime(item.time, true)}
                  </span>
                </span>
              </div>
              <a
                href={`/turra/${item.id}`}
                className="text-gray-700 hover:text-gray-900 text-sm transition-colors duration-200 hover:underline"
              >
                {item.summary}
              </a>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-4 text-right">
        {category !== 'top-25-turras' && (
          <a
            href={`/${formatCategoryUrl(category)}`}
            className="text-whiskey-600 hover:text-whiskey-800 text-sm font-medium"
          >
            Ver más →
          </a>
        )}
      </div>
    </div>
  );
} 