import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Search } from 'lucide-react';

// Quita acentos y pasa a minúsculas para comparar sin importar cómo se escriba
const normalizar = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MAX_RESULTADOS = 50;

// Lista desplegable con filtrado mientras se escribe (catálogo, clientes).
// La lista usa position: fixed porque la tabla de productos tiene scroll
// horizontal y un dropdown absoluto quedaría recortado.
export default function BuscadorLista({
  items,
  textoBusqueda,
  renderItem,
  onSelect,
  placeholder = 'Buscar...',
  inputClassName = 'py-1 text-xs',
  anchoMinimo = 420,
}) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  // Cada palabra escrita debe aparecer en el texto del item, en cualquier orden
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  const filtrados = items
    .filter((item) => {
      const campo = normalizar(textoBusqueda(item));
      return palabras.every((w) => campo.includes(w));
    })
    .slice(0, MAX_RESULTADOS);

  const actualizarPosicion = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, anchoMinimo) });
  };

  useLayoutEffect(() => {
    if (!abierto) return;
    actualizarPosicion();
    window.addEventListener('scroll', actualizarPosicion, true);
    window.addEventListener('resize', actualizarPosicion);
    return () => {
      window.removeEventListener('scroll', actualizarPosicion, true);
      window.removeEventListener('resize', actualizarPosicion);
    };
  }, [abierto]);

  useEffect(() => setActivo(0), [texto]);

  // Mantiene visible la opción resaltada al navegar con flechas
  useEffect(() => {
    listaRef.current?.children[activo]?.scrollIntoView({ block: 'nearest' });
  }, [activo]);

  const elegir = (item) => {
    onSelect(item);
    setTexto('');
    setAbierto(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (abierto && filtrados[activo]) {
        e.preventDefault();
        elegir(filtrados[activo]);
      }
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  return (
    <div className="relative">
      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={onKeyDown}
        className={`w-full pl-7 pr-2 border border-gray-300 rounded ${inputClassName}`}
        placeholder={placeholder}
      />
      {abierto && pos && (
        <ul
          ref={listaRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm"
        >
          {filtrados.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">Sin coincidencias</li>
          ) : (
            filtrados.map((item, idx) => (
              <li
                key={idx}
                // onMouseDown en vez de onClick: se dispara antes del blur del input
                onMouseDown={(e) => { e.preventDefault(); elegir(item); }}
                onMouseEnter={() => setActivo(idx)}
                className={`px-3 py-2 cursor-pointer ${idx === activo ? 'bg-blue-50 text-blue-900' : 'text-gray-800'}`}
              >
                {renderItem(item)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
