import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import QuoteForm from './components/QuoteForm';
import ManagementView from './components/ManagementView';

function App() {
  const [currentView, setCurrentView] = useState('form');
  const [historialCotizaciones, setHistorialCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quoteToEdit, setQuoteToEdit] = useState(null);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const response = await fetch('http://localhost:8000/cotizaciones');
        if (response.ok) {
          const data = await response.json();
          // Transformar datos del backend al formato esperado por el frontend si es necesario
          const formattedData = data.map(cot => ({
            id: cot.id,
            folio: cot.folio,
            fecha: cot.fecha,
            cliente: cot.cliente_nombre,
            productos: cot.productos_resumen || 'Sin productos',
            total: cot.total,
            total_costo: cot.total_costo,
            fechaCreacion: cot.created_at
          }));
          setHistorialCotizaciones(formattedData);
        }
      } catch (error) {
        console.error('Error fetching historial:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, []);

  const addCotizacion = (nueva) => {
    setHistorialCotizaciones(prev => [nueva, ...prev]);
  };

  const loadQuote = async (folio) => {
    try {
      const response = await fetch(`http://localhost:8000/cotizaciones/${folio}`);
      if (response.ok) {
        const data = await response.json();
        setQuoteToEdit(data);
        setCurrentView('form');
      } else {
        alert('Error al cargar la cotización desde el servidor');
      }
    } catch (error) {
      console.error('Error loading quote:', error);
      alert('Error de conexión');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header onSetView={setCurrentView} currentView={currentView} />
      <main className="container mx-auto px-4 lg:px-12 py-8 lg:py-16 max-w-6xl">
        {currentView === 'form' ? (
          <QuoteForm onSave={addCotizacion} initialQuote={quoteToEdit} />
        ) : (
          <ManagementView
            historial={historialCotizaciones}
            setHistorial={setHistorialCotizaciones}
            onLoadQuote={loadQuote}
          />
        )}
      </main>
    </div>
  );
}

export default App;