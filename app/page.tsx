import React from 'react';
import { TweetFacade } from "../infrastructure";
import { CategoryCard } from './components/CategoryCard';
import { AdvertisementCard } from './components/AdvertisementCard';
import { HeaderDescription } from './components/HeaderDescription';

async function getData() {
  const tweetFacade = new TweetFacade();
  const allTweets = await tweetFacade.tweetProvider.getAllTweets();
  const tweets = allTweets.flat();
  const categories = tweetFacade.getCategories();
  const tweetsPerCategory = await Promise.all(categories.map(async category => {
    if (category === 'top-25-turras') {
      return tweetFacade.tweetProvider.getTop25Tweets()
        .map(tweet => ({
          ...tweet,
          summary: tweetFacade.tweetProvider.getSummaryById(tweet.id),
          engagement: 0
        }));
    }
    if (category === 'las-más-nuevas') {
      return tweetFacade.tweetProvider.get25newestTweets()
        .map(tweet => ({
          ...tweet,
          summary: tweetFacade.tweetProvider.getSummaryById(tweet.id),
          engagement: 0
        }));
    }
    
    const categoryTweets = await tweetFacade.tweetProvider.getTweetsByCategory(category);
    return categoryTweets.length > 0 
      ? categoryTweets
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 10)
          .map(tweet => ({
            ...tweet,
            summary: tweetFacade.tweetProvider.getSummaryById(tweet.id),
            engagement: 0
          }))
      : [];
  }));
  const lastUpdateDate = new Date(tweetFacade.tweetProvider.get25newestTweets()[0].time).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).replace(' de ', ' del ')
  return { categories, tweets, tweetsPerCategory, totalTweets: allTweets.length, lastUpdateDate };
}

function formatCategoryTitle(category: string): string {
  return category
    .replace(/-/g, ' ')
    .split(' ')
    .map((word, index) => index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toLowerCase())
    .join(' ');
}

export default async function Home() {
  const data = await getData();
  const { categories, totalTweets, tweetsPerCategory } = data;
  return (
    <div className="container mx-auto px-4 py-8">
      <HeaderDescription 
        totalTweets={totalTweets}
        lastUpdateDate={ data.lastUpdateDate }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => {
          const categoryTweets = tweetsPerCategory[index];
          if (index === 5) {
            return (
              <React.Fragment key={`group-${index}-${category}`}>
                <CategoryCard 
                  key={`category-${index}-${category}`}
                  category={category}
                  tweets={categoryTweets}
                  formatCategoryTitle={formatCategoryTitle}
                />
                <AdvertisementCard key={`ad-${category}`} />
              </React.Fragment>
            );
          }
          
          return (
            <React.Fragment key={`group-${index}-${category}`}>
              <CategoryCard 
                key={`category-${index}-${category}`}
                category={category}
                tweets={categoryTweets}
                formatCategoryTitle={formatCategoryTitle}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
