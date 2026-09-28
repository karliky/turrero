// Markdown note of a turra for Obsidian (zettelkasten "atom" note).
import { slugify } from './text';
import { tweetUrl } from './site';
import type { Thread } from './types';

export function obsidianFileName(thread: Thread): string {
  return `${thread.id}-${slugify(thread.title).slice(0, 80)}.md`;
}

const yaml = (value: string) => JSON.stringify(value);
const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export function renderObsidianNote(thread: Thread, createdAt: Date = new Date()): string {
  const tags = ['atom', 'turras', ...thread.categories.map((c) => c.slug.replace(/-/g, '_'))];
  const links = thread.tweets.flatMap((tweet) => tweet.links);

  return [
    '---',
    'type: atom',
    `created: ${createdAt.toISOString().slice(0, 16).replace('T', ' ')}`,
    `source: ${yaml(tweetUrl(thread.author.handle, thread.id))}`,
    `thread_id: ${yaml(thread.id)}`,
    `author_x: ${yaml(`@${thread.author.handle}`)}`,
    `author_name: ${yaml(thread.author.name)}`,
    'tags:',
    ...tags.map((tag) => `  - ${tag}`),
    '---',
    '',
    `# ${thread.title}`,
    '',
    '## Thread',
    ...thread.tweets.flatMap((tweet, index) => [
      `${index + 1}. ${oneLine(tweet.text)}`,
      `   - Source: [${tweet.id}](${tweetUrl(thread.author.handle, tweet.id)})`,
    ]),
    '',
    '## Links / Cards',
    ...(links.length === 0
      ? ['- No link cards found in this thread.']
      : links.flatMap((link) => [
          `- [${oneLine(link.title ?? link.domain)}](${link.url})`,
          `  - domain: ${link.domain}`,
          ...(link.description ? [`  - description: ${oneLine(link.description)}`] : []),
        ])),
    '',
    '## Tags / Context',
    ...(thread.categories.length === 0 ? ['- [[turras]]'] : thread.categories.map((c) => `- [[${c.name}]]`)),
    '',
  ].join('\n');
}
