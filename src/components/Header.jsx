import React from 'react';
import { FileText, Mail, Phone } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-12 py-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-4 mb-4 lg:mb-0">
            <div className="bg-white p-2 rounded-lg">
              <FileText className="w-8 h-8 text-blue-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">QUÍMICA GUBA</h1>
              <p className="text-blue-200 text-sm">Química Industrial Avanzada</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>(614) 481-91-84</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>ventas@quimicaguba.com</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;