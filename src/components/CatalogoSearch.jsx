import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Search } from 'lucide-react';

// Quita acentos y pasa a minúsculas para comparar sin importar cómo se escriba
const normalizar = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MAX_RESULTADOS = 50;

// Buscador del catálogo con filtrado mientras se escribe.
// La lista usa position: fixed porque la tabla de productos tiene scroll
// horizontal y un dropdown absoluto quedaría recortado.
export default function CatalogoSearch({ productos, onSelect }) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  // Cada palabra escrita debe aparecer en clave o descripción, en cualquier orden
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  const filtrados = productos
    .filter((p) => {
      const campo = normalizar(`${p.clave} ${p.descripcion}`);
      return palabras.every((w) => campo.includes(w));
    })
    .slice(0, MAX_RESULTADOS);

  const actualizarPosicion = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 420) });
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

  const elegir = (prod) => {
    onSelect(prod);
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
      <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={onKeyDown}
        className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-xs"
        placeholder="Buscar en catálogo..."
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
            filtrados.map((prod, idx) => (
              <li
                key={`${prod.clave}-${idx}`}
                // onMouseDown en vez de onClick: se dispara antes del blur del input
                onMouseDown={(e) => { e.preventDefault(); elegir(prod); }}
                onMouseEnter={() => setActivo(idx)}
                className={`px-3 py-2 cursor-pointer ${idx === activo ? 'bg-blue-50 text-blue-900' : 'text-gray-800'}`}
              >
                <span className="font-medium">{prod.clave}</span> - {prod.descripcion}
                <span className="text-gray-500"> - ${prod.precio} ({prod.moneda})</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
