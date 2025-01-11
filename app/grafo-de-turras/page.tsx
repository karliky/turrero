import { TweetProvider } from '@/infrastructure/TweetProvider';
import GraphVisualization from './GraphVisualization';
import { FaArrowLeft, FaQuestionCircle } from "react-icons/fa";
import Link from 'next/link';
import { Metadata } from 'next';

export default async function GraphPage() {
  const tweetProvider = new TweetProvider();
  const nodes = tweetProvider.getGraphData();

  return (
    <main className="min-h-screen">
      {/* Back Navigation */}
      <nav className="border-whiskey-200">
        <div className="container mx-auto px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-whiskey-700 hover:text-whiskey-900 transition-colors"
          >
            <FaArrowLeft className="text-sm" />
            <span className="font-medium">Volver</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-2 pb-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-3 text-whiskey-900 leading-tight">
            Grafo de <span style={{ color: '#a5050b' }}>Turras</span>
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <p className="text-whiskey-600 flex-1">
              Visualización de cómo se relacionan los distintos hilos de turras entre sí. 
              El tamaño de los nodos corresponde al número de visualizaciones de cada hilo.
            </p>
            <button
              className="inline-flex items-center gap-2 text-whiskey-700 hover:text-whiskey-900"
              aria-label="Mostrar ayuda"
              id="show-help"
            >
              <FaQuestionCircle className="text-xl" />
              <span className="hidden sm:inline">Ayuda</span>
            </button>
          </div>
        </header>

        {/* Graph Container */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden relative">
          <GraphVisualization nodes={nodes} />
        </div>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: 'Grafo de Turras',
  description: 'Visualización interactiva de las conexiones entre las turras de Javier G. Recuenco',
  openGraph: {
    title: 'Grafo de Turras - El Turrero Post',
    description: 'Visualización interactiva de las conexiones entre las turras de Javier G. Recuenco',
  }
}; 