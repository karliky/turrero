import { topics, type Topic } from "./topics";

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <section 
      className="bg-white rounded-lg shadow-md p-6 transition-shadow hover:shadow-lg"
      aria-labelledby={`topic-${topic.id}`}
    >
      <h2 
        id={`topic-${topic.id}`}
        className="text-2xl font-semibold text-whiskey-800 mb-4 flex items-center gap-2"
      >
        <span className="text-brand text-xl">#</span>
        {topic.title}
      </h2>
      
      <p className="text-whiskey-700 mb-6 leading-relaxed">
        {topic.description}
      </p>

      <ul className="space-y-3" role="list">
        {topic.articles.map((article) => (
          <li key={article.id}>
            <a
              href={`/turra/${article.id}`}
              className="text-brand hover:text-whiskey-950 transition-colors block p-2 -ml-2 rounded-md hover:bg-whiskey-50"
            >
              {article.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HallOfFame() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-whiskey-900 mb-4">
          🏆 El salón de la fama 🏆
        </h1>
        <p className="text-xl text-whiskey-700">
          Las turras más influyentes y conceptos fundamentales que debes conocer.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>
    </main>
  );
}