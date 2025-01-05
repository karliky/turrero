import { FaFilePdf, FaDownload } from 'react-icons/fa';

export default function PDFVersion() {
  return (
    <div className="bg-whiskey-50 min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-center justify-center mb-6">
              <FaFilePdf className="text-6xl text-whiskey-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-whiskey-900 mb-6 text-center">
              Versiones descargables de El Turrero Post
            </h1>

            <div className="prose max-w-none mb-8">
              <p className="text-gray-600 leading-relaxed mb-4">
                Hemos recopilado todas las turras en diferentes formatos para facilitar su lectura offline. 
                Los documentos incluyen:
              </p>
              
              <ul className="list-disc pl-6 text-gray-600 mb-6">
                <li>Índice organizado por categorías</li>
                <li>Todas las turras hasta la fecha</li>
                <li>Formatos optimizados para diferentes dispositivos</li>
              </ul>

              <div className="bg-whiskey-50 p-4 rounded-lg mb-6">
                <p className="text-whiskey-700 text-sm">
                  <strong>Nota:</strong> El archivo PDF tiene un tamaño de 99mb debido a la cantidad de contenido incluido.
                  La versión EPUB es más ligera y optimizada para lectores electrónicos con un tamaño de 19mb.
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <a
                href="/turras.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-whiskey-600 text-white px-6 py-3 rounded-lg hover:bg-whiskey-700 transition-colors"
              >
                <FaFilePdf />
                Descargar PDF
              </a>
              <a
                href="/turras.epub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-whiskey-600 text-white px-6 py-3 rounded-lg hover:bg-whiskey-700 transition-colors"
              >
                <FaDownload />
                Descargar EPUB
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 