import { MetadataRoute } from 'next'
import { TweetFacade } from '../infrastructure'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://turrero.vercel.app'
  const tweetFacade = new TweetFacade()
  
  // Get all tweets for dynamic routes
  const allTweets = await tweetFacade.tweetProvider.getAllTweets()
  const tweets = allTweets.flat()
  
  // Get all categories
  const categories = tweetFacade.getCategories()

  // Static routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/glosario`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/biblioteca`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hall-of-fame`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sobre-esta-web`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/version-en-pdf`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/grafo-de-turras`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]

  // Category routes
  const categoryRoutes = categories.map((category) => ({
    url: `${baseUrl}/${category.toLowerCase().replace(/\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // Individual turra routes
  const turraRoutes = tweets.map((tweet) => ({
    url: `${baseUrl}/turra/${tweet.id}`,
    lastModified: new Date(tweet.time),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...categoryRoutes, ...turraRoutes]
} 