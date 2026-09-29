import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { usePosicionFlotante } from './usePosicionFlotante';
import { ListaFlotante, OpcionLista, SinOpciones } from './ListaFlotante';
import { claseCampo, claseCampoCompacto } from './ui';

// Quita acentos y pasa a minúsculas para comparar sin importar cómo se escriba
const normalizar = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const MAX_RESULTADOS = 50;

// Lista desplegable con filtrado mientras se escribe (catálogo, clientes).
export default function BuscadorLista({
  items,
  textoBusqueda,
  renderItem,
  onSelect,
  placeholder = 'Buscar...',
  compacto = false,
  anchoMinimo = 420,
}) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef(null);
  const listaRef = useRef(null);
  const pos = usePosicionFlotante(inputRef, abierto, anchoMinimo);

  // Cada palabra escrita debe aparecer en el texto del item, en cualquier orden
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  const filtrados = items
    .filter((item) => {
      const campo = normalizar(textoBusqueda(item));
      return palabras.every((w) => campo.includes(w));
    })
    .slice(0, MAX_RESULTADOS);

  useEffect(() => setActivo(0), [texto]);

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
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={onKeyDown}
        className={`${compacto ? claseCampoCompacto : claseCampo} pl-8`}
        placeholder={placeholder}
      />
      {abierto && (
        <ListaFlotante pos={pos} listaRef={listaRef} activo={activo}>
          {filtrados.length === 0 ? (
            <SinOpciones />
          ) : (
            filtrados.map((item, idx) => (
              <OpcionLista
                key={idx}
                activa={idx === activo}
                onElegir={() => elegir(item)}
                onHover={() => setActivo(idx)}
              >
                {renderItem(item)}
              </OpcionLista>
            ))
          )}
        </ListaFlotante>
      )}
    </div>
  );
}
