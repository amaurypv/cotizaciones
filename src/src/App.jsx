import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import QuoteForm from './components/QuoteForm';
import ManagementView from './components/ManagementView';
import Login from './components/Login';
import apiClient, { authService } from './utils/apiClient';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [currentView, setCurrentView] = useState('form');
  const [historialCotizaciones, setHistorialCotizaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quoteToEdit, setQuoteToEdit] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistorial();
    }
  }, [isAuthenticated]);

  const fetchHistorial = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/cotizaciones');
      const formattedData = response.data.map(cot => ({
        id: cot.id,
        folio: cot.folio,
        fecha: cot.fecha,
        cliente: cot.cliente_nombre,
        productos: cot.productos_resumen || 'Sin productos',
        total: cot.total,
        total_costo: cot.total_costo,
        monedas: cot.monedas,
        fechaCreacion: cot.created_at
      }));
      setHistorialCotizaciones(formattedData);
    } catch (error) {
      console.error('Error fetching historial:', error);
      setError('No se pudo conectar con el servidor o la sesión expiró.');
    } finally {
      setLoading(false);
    }
  };

  const addCotizacion = (nueva) => {
    setHistorialCotizaciones(prev => [nueva, ...prev]);
  };

  const loadQuote = async (folio) => {
    try {
      const response = await apiClient.get(`/cotizaciones/${folio}`);
      setQuoteToEdit(response.data);
      setCurrentView('form');
    } catch (error) {
      console.error('Error loading quote:', error);
      alert('Error al cargar la cotización desde el servidor');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="bg-blue-900 text-white py-1 px-4 text-xs flex justify-between items-center">
        <span>SISTEMA DE COTIZACIONES - GUBA</span>
        <button
          onClick={handleLogout}
          className="hover:underline font-bold"
        >
          Cerrar Sesión
        </button>
      </div>
      <Header onSetView={setCurrentView} currentView={currentView} />
      <main className="container mx-auto px-4 lg:px-12 py-8 lg:py-16 max-w-6xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando datos del historial...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 font-bold">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchHistorial()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-semibold"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'form' ? (
              <QuoteForm onSave={addCotizacion} initialQuote={quoteToEdit} />
            ) : (
              <ManagementView
                historial={historialCotizaciones}
                setHistorial={setHistorialCotizaciones}
                onLoadQuote={loadQuote}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
