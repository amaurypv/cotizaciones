import React from 'react';
import { FileText, Mail, Phone } from 'lucide-react';

const Header = ({ onSetView, currentView }) => {
  return (
    <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-12 py-4 lg:py-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div
            className="flex items-center space-x-4 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onSetView('form')}
          >
            <div className="bg-white p-2 rounded-lg">
              <FileText className="w-8 h-8 text-blue-900" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">QUÍMICA GUBA</h1>
              <p className="text-blue-200 text-xs lg:text-sm">Química Industrial Avanzada</p>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <button
              onClick={() => onSetView('form')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'form'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'text-white hover:bg-blue-800'
                }`}
            >
              Nueva Cotización
            </button>
            <button
              onClick={() => onSetView('management')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${currentView === 'management'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-white hover:bg-blue-800'
                }`}
            >
              <Phone className="hidden lg:inline w-4 h-4" />
              <span>Gestión BD / Historial</span>
            </button>
          </nav>

          <div className="hidden lg:flex flex-col items-end space-y-1 text-xs text-blue-100">
            <div className="flex items-center space-x-2">
              <Phone className="w-3 h-3" />
              <span>(614) 481-91-84</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-3 h-3" />
              <span>ventas@quimicaguba.com</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;