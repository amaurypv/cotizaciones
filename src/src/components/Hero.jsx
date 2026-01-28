import React from 'react';
import { FileText, Users, Calculator, Download } from 'lucide-react';

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-16">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Generador de Cotizaciones
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
          Sistema profesional para crear cotizaciones de productos químicos industriales de manera rápida y eficiente
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-blue-200" />
            <h3 className="text-lg font-semibold mb-2">Cotizaciones Profesionales</h3>
            <p className="text-blue-200 text-sm">Genera PDF con formato corporativo</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-blue-200" />
            <h3 className="text-lg font-semibold mb-2">Base de Clientes</h3>
            <p className="text-blue-200 text-sm">Gestiona información de clientes</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-center">
            <Calculator className="w-12 h-12 mx-auto mb-4 text-blue-200" />
            <h3 className="text-lg font-semibold mb-2">Cálculos Automáticos</h3>
            <p className="text-blue-200 text-sm">IVA, subtotales y totales</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-center">
            <Download className="w-12 h-12 mx-auto mb-4 text-blue-200" />
            <h3 className="text-lg font-semibold mb-2">Descarga Instantánea</h3>
            <p className="text-blue-200 text-sm">PDF listo para enviar</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;