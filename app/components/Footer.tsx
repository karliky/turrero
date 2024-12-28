import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-whiskey-100 text-whiskey-700">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Logo/Brand */}
          <div className="text-whiskey-800">
            <h3 className="font-medium">El Turrero Post es una iniciativa por y para la <a href="https://x.com/CPSComunidad" target="_blank" className="text-whiskey-600 hover:text-whiskey-900 transition-colors">comunidad CPS</a>.</h3>
          </div>
          
          {/* Links */}
          <div className="flex space-x-6">
            <Link href="/contacto" className="text-whiskey-600 hover:text-whiskey-900 transition-colors">
              Contacto
            </Link>
          </div>
        </div>
        
        <div className="border-t border-whiskey-200 mt-6 pt-6 text-sm text-whiskey-500 text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} El Turrero Post.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 