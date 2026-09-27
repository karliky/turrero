// Recorded-shape X API v2 responses for a thread by @autora (user 1).
import type { RawResponse, RawTweet } from '../../lib/x';

const users = [
  { id: '1', username: 'autora', name: 'La Autora', profile_image_url: 'https://pbs.twimg.com/profile_images/1/a.jpg' },
  { id: '2', username: 'citado', name: 'Persona Citada' },
];

/** GET /2/tweets/1000 */
export const rootResponse: RawResponse<RawTweet> = {
  data: {
    id: '1000',
    conversation_id: '1000',
    author_id: '1',
    created_at: '2024-05-01T08:00:00.000Z',
    text: 'Hoy hablamos de un libro https://t.co/book https://t.co/photo',
    entities: {
      urls: [
        {
          url: 'https://t.co/book',
          expanded_url: 'https://www.goodreads.com/book/show/1-libro',
          title: 'El Libro',
          description: 'Una descripción',
          images: [{ url: 'https://pbs.twimg.com/news_img/1.jpg' }],
        },
        { url: 'https://t.co/photo', expanded_url: 'https://x.com/autora/status/1000/photo/1', media_key: '3_1' },
      ],
    },
    attachments: { media_keys: ['3_1'] },
    public_metrics: { like_count: 10, retweet_count: 2, reply_count: 1, quote_count: 1, bookmark_count: 3, impression_count: 500 },
  },
  includes: {
    users,
    media: [{ media_key: '3_1', type: 'photo', url: 'https://pbs.twimg.com/media/foto.jpg', alt_text: 'Una foto' }],
  },
};

/** GET /2/tweets/search/all (first page) */
export const searchPage1: RawResponse<RawTweet[]> = {
  data: [
    {
      id: '1004',
      conversation_id: '1000',
      author_id: '1',
      created_at: '2024-05-01T08:04:00.000Z',
      text: '@alguien gracias!',
      in_reply_to_user_id: '9',
      referenced_tweets: [{ type: 'replied_to', id: '9999' }],
    },
    {
      id: '1003',
      conversation_id: '1000',
      author_id: '1',
      created_at: '2024-05-01T08:03:00.000Z',
      text: 'Otra respuesta al segundo tweet (rama)',
      in_reply_to_user_id: '1',
      referenced_tweets: [{ type: 'replied_to', id: '1001' }],
    },
    {
      id: '1002',
      conversation_id: '1000',
      author_id: '1',
      created_at: '2024-05-01T08:02:00.000Z',
      text: 'Tercero con gif',
      in_reply_to_user_id: '1',
      referenced_tweets: [{ type: 'replied_to', id: '1001' }],
      attachments: { media_keys: ['16_1'] },
    },
    {
      id: '1001',
      conversation_id: '1000',
      author_id: '1',
      created_at: '2024-05-01T08:01:00.000Z',
      text: 'Texto truncado… https://t.co/quote',
      note_tweet: { text: 'Texto largo completo de más de 280 caracteres https://t.co/quote' },
      in_reply_to_user_id: '1',
      referenced_tweets: [
        { type: 'replied_to', id: '1000' },
        { type: 'quoted', id: '555' },
      ],
      entities: { urls: [{ url: 'https://t.co/quote', expanded_url: 'https://x.com/citado/status/555' }] },
    },
  ],
  includes: {
    users,
    tweets: [{ id: '555', conversation_id: '555', author_id: '2', created_at: '2023-01-01T00:00:00.000Z', text: 'El tweet citado' }],
    media: [
      {
        media_key: '16_1',
        type: 'animated_gif',
        preview_image_url: 'https://pbs.twimg.com/tweet_video_thumb/gif.jpg',
        variants: [{ bit_rate: 0, content_type: 'video/mp4', url: 'https://video.twimg.com/tweet_video/gif.mp4' }],
      },
    ],
  },
  meta: { next_token: 'page2' },
};

/** GET /2/tweets/search/all?pagination_token=page2 — uses the newer "post" naming */
export const searchPage2: RawResponse<RawTweet[]> = {
  data: [
    {
      id: '1005',
      conversation_id: '1000',
      author_id: '1',
      created_at: '2024-05-01T08:05:00.000Z',
      text: 'Cuarto con vídeo',
      in_reply_to_user_id: '1',
      referenced_posts: [{ type: 'replied_to', id: '1002' }],
      attachments: { media_keys: ['7_1'] },
    },
  ],
  includes: {
    users,
    media: [
      {
        media_key: '7_1',
        type: 'video',
        preview_image_url: 'https://pbs.twimg.com/ext_tw_video_thumb/7/pu/img/poster.jpg',
        variants: [
          { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/ext_tw_video/7/pl/playlist.m3u8' },
          { bit_rate: 256000, content_type: 'video/mp4', url: 'https://video.twimg.com/ext_tw_video/7/vid/low.mp4' },
          { bit_rate: 2176000, content_type: 'video/mp4', url: 'https://video.twimg.com/ext_tw_video/7/vid/high.mp4' },
        ],
      },
    ],
  },
};
