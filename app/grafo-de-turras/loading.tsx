export default function Loading() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-10 bg-whiskey-200 rounded w-1/3 mb-6"></div>
        <div className="h-24 bg-whiskey-100 rounded mb-8"></div>
        <div className="h-[calc(100vh-300px)] bg-whiskey-50 rounded"></div>
      </div>
    </div>
  );
} 