import React, { useEffect } from 'react';

// Contenedor visual de la lista: tarjeta blanca con sombra suave.
export function ListaFlotante({ pos, listaRef, activo, children }) {
  // Mantiene visible la opción resaltada al navegar con flechas
  useEffect(() => {
    listaRef.current?.children[activo]?.scrollIntoView({ block: 'nearest' });
  }, [activo, listaRef]);

  if (!pos) return null;
  return (
    <ul
      ref={listaRef}
      role="listbox"
      style={{ position: 'fixed', ...pos }}
      className="z-50 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
    >
      {children}
    </ul>
  );
}

export function OpcionLista({ activa, seleccionada, onElegir, onHover, children }) {
  return (
    <li
      role="option"
      aria-selected={seleccionada}
      // onMouseDown en vez de onClick: se dispara antes del blur del ancla
      onMouseDown={(e) => { e.preventDefault(); onElegir(); }}
      onMouseEnter={onHover}
      className={`cursor-pointer px-3 py-2 ${activa ? 'bg-blue-50 text-blue-900' : 'text-gray-800'} ${seleccionada ? 'font-medium' : ''}`}
    >
      {children}
    </li>
  );
}

export function SinOpciones({ children = 'Sin coincidencias' }) {
  return <li className="px-3 py-2 text-gray-500">{children}</li>;
}
