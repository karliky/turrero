import Link from 'next/link';
import { FaFilePdf, FaDownload } from 'react-icons/fa';

export default function PDFVersion() {
  return (
    <div className="bg-whiskey-50 min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-block mb-8 text-whiskey-600 hover:text-whiskey-800 transition-colors"
          >
            ← Volver al inicio
          </Link>

          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-center justify-center mb-6">
              <FaFilePdf className="text-6xl text-whiskey-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-whiskey-900 mb-6 text-center">
              Versión en PDF de El Turrero Post
            </h1>

            <div className="prose max-w-none mb-8">
              <p className="text-gray-600 leading-relaxed mb-4">
                Hemos recopilado todas las turras en un único documento PDF para facilitar su lectura offline. 
                El documento incluye:
              </p>
              
              <ul className="list-disc pl-6 text-gray-600 mb-6">
                <li>Índice organizado por categorías</li>
                <li>Todas las turras hasta la fecha</li>
                <li>Turras a dos columnas para facilitar la lectura</li>
              </ul>

              <div className="bg-whiskey-50 p-4 rounded-lg mb-6">
                <p className="text-whiskey-700 text-sm">
                  <strong>Nota:</strong> El archivo tiene un tamaño de 120MB debido a la cantidad de contenido incluido.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <a
                href="https://drive.google.com/file/d/15LIQ8Car0BsmVgHKSVfZuYJ0x8xPl2No/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-whiskey-600 text-white px-6 py-3 rounded-lg hover:bg-whiskey-700 transition-colors"
              >
                <FaDownload />
                Descargar PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 