import React from 'react';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue-400">QUÍMICA GUBA</h3>
            <p className="text-gray-300 mb-4">
              Líder en la distribución de productos químicos industriales con más de 20 años de experiencia en el mercado.
            </p>
            <p className="text-sm text-gray-400">
              Química Industrial Avanzada GUBA
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-blue-400">Contacto</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-400" />
                <div className="text-sm">
                  <p>DE LAS INDUSTRIAS No.Ext-7301, No.Int-A</p>
                  <p>NOMBRE DE DIOS, C.P.31110</p>
                  <p>Chihuahua, Chihuahua, MÉXICO</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-blue-400" />
                <span className="text-sm">(614) 481-91-84</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-blue-400" />
                <span className="text-sm">(614) 121-1388</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-blue-400">Información Digital</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-sm">ventas@quimicaguba.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-sm">www.quimicaguba.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 Química Guba. Todos los derechos reservados. | Amaury Pérez Verdejo - Ventas
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;