import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FilePlus, ClipboardList, Moon, Sun, LogOut, Menu, X, FileText } from 'lucide-react';
import QuoteForm from './components/QuoteForm';
import ManagementView from './components/ManagementView';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import apiClient, { authService } from './utils/apiClient';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'form',        label: 'Nueva Cotización',   icon: FilePlus },
  { id: 'management',  label: 'Historial / BD',     icon: ClipboardList },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [currentView, setCurrentView] = useState('dashboard');
  const [historialCotizaciones, setHistorialCotizaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quoteToEdit, setQuoteToEdit] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (isAuthenticated) fetchHistorial();
  }, [isAuthenticated]);

  const fetchHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/cotizaciones');
      setHistorialCotizaciones(response.data.map(cot => ({
        id: cot.id,
        folio: cot.folio,
        fecha: cot.fecha,
        validez: cot.validez,
        cliente: cot.cliente_nombre,
        productos: cot.productos_resumen || 'Sin productos',
        total: cot.total,
        total_costo: cot.total_costo,
        monedas: cot.monedas,
        estatus: cot.estatus || 'Enviada',
        fechaCreacion: cot.created_at,
      })));
    } catch {
      setError('No se pudo conectar con el servidor o la sesión expiró.');
    } finally {
      setLoading(false);
    }
  };

  const addCotizacion = (nueva) => {
    setHistorialCotizaciones(prev => [nueva, ...prev]);
  };

  const loadQuote = async (folio, asDuplicate = false, startPreview = false, renew = false) => {
    try {
      const response = await apiClient.get(`/cotizaciones/${folio}`);
      const data = response.data;
      if (asDuplicate || renew) data.folio = '';
      // Al renovar, la cotización arranca con fecha de hoy para recalcular su vigencia.
      if (renew) data.fecha = new Date().toISOString().split('T')[0];
      setQuoteToEdit(data);
      setPreviewMode(startPreview);
      setCurrentView('form');
      setSidebarOpen(false);
    } catch {
      alert('Error al cargar la cotización desde el servidor');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  const handleSetView = (view) => {
    if (view === 'form' && currentView === 'form') setQuoteToEdit(null);
    setPreviewMode(false);
    setCurrentView(view);
    setSidebarOpen(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-60 bg-blue-900 dark:bg-gray-900 text-white flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-blue-800 dark:border-gray-700">
          <div className="bg-white p-1.5 rounded-lg">
            <FileText className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">QUÍMICA GUBA</p>
            <p className="text-blue-300 dark:text-gray-400 text-xs">Cotizaciones</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSetView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentView === id
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-blue-100 dark:text-gray-300 hover:bg-blue-800 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Pie del sidebar */}
        <div className="px-3 py-4 border-t border-blue-800 dark:border-gray-700 space-y-1">
          <button
            onClick={() => setDarkMode(d => !d)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 dark:text-gray-300 hover:bg-blue-800 dark:hover:bg-gray-800 transition-all"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 dark:text-gray-300 hover:bg-red-700 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar móvil */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-blue-900 text-white">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">QUÍMICA GUBA</span>
          <button onClick={() => setDarkMode(d => !d)}>
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 dark:border-blue-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Cargando datos...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{error}</p>
              <button onClick={fetchHistorial} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-semibold">
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <Dashboard historial={historialCotizaciones} />
              )}
              {currentView === 'form' && (
                <QuoteForm
                  onSave={(nueva) => { addCotizacion(nueva); }}
                  initialQuote={quoteToEdit}
                  initialShowPreview={previewMode}
                  onExitPreview={() => { setPreviewMode(false); setCurrentView('management'); }}
                />
              )}
              {currentView === 'management' && (
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
    </div>
  );
}

export default App;
