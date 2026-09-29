import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePosicionFlotante } from './usePosicionFlotante';
import { ListaFlotante, OpcionLista } from './ListaFlotante';

// Componentes base de la interfaz. Cambiar el estilo aquí lo cambia en todas
// las pantallas que los usan.

const baseCampo =
  'w-full border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

// Campos de formulario normales y su versión compacta para la tabla de productos
export const claseCampo = `${baseCampo} h-10 rounded-lg px-3 text-sm`;
export const claseCampoCompacto = `${baseCampo} h-9 rounded-md px-2.5 text-sm`;
// Campos de uso interno (proveedor, costo): no salen en el PDF
export const claseCampoInterno =
  'w-full h-9 rounded-md border border-dashed border-gray-300 bg-gray-50 px-2.5 text-xs text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20';

export function Etiqueta({ children, icono: Icono }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
      {Icono && <Icono className="h-4 w-4 text-gray-400" />}
      {children}
    </label>
  );
}

// Etiqueta + campo de texto
export function Campo({ label, icono, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <Etiqueta icono={icono}>{label}</Etiqueta>}
      <input className={claseCampo} {...props} />
    </div>
  );
}

export function Tarjeta({ titulo, icono: Icono, accion, children, sinPadding = false, className = '' }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {titulo && (
        <header className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            {Icono && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca-50 text-marca-700">
                <Icono className="h-4 w-4" />
              </span>
            )}
            {titulo}
          </h3>
          {accion}
        </header>
      )}
      <div className={sinPadding ? '' : 'p-6'}>{children}</div>
    </section>
  );
}

const VARIANTES_BOTON = {
  primario: 'bg-marca-900 text-white hover:bg-marca-800 shadow-sm',
  exito: 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
  secundario: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
  peligro: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

const TAMANOS_BOTON = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-9 px-3 text-sm',
};

export function Boton({ variante = 'primario', tamano = 'md', icono: Icono, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`btn-plano inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES_BOTON[variante]} ${TAMANOS_BOTON[tamano]} ${className}`}
      {...props}
    >
      {Icono && <Icono className="h-4 w-4" />}
      {children}
    </button>
  );
}

// Botón de solo icono (acciones por fila en tablas)
export function BotonIcono({ icono, peligro = false, className = '', ...props }) {
  const Icono = icono;
  return (
    <button
      type="button"
      className={`btn-plano inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${peligro ? 'text-gray-400 hover:bg-red-50 hover:text-red-600' : 'text-gray-400 hover:bg-blue-50 hover:text-blue-700'} ${className}`}
      {...props}
    >
      <Icono className="h-4 w-4" />
    </button>
  );
}

// Select nativo con el estilo de los campos; para listas cortas (unidad, moneda)
export function SelectNativo({ compacto = false, children, className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <select
        className={`${compacto ? claseCampoCompacto : claseCampo} appearance-none pr-8`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

// Selector con la misma lista flotante que BuscadorLista.
// options: [{ value, label }]
export function Selector({ value, options, onChange, placeholder = 'Selecciona una opción...' }) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const botonRef = useRef(null);
  const listaRef = useRef(null);
  const pos = usePosicionFlotante(botonRef, abierto);

  const seleccionada = options.find((o) => o.value === value);

  const abrir = () => {
    setActivo(Math.max(options.findIndex((o) => o.value === value), 0));
    setAbierto(true);
  };

  const elegir = (opcion) => {
    onChange(opcion.value);
    setAbierto(false);
  };

  const onKeyDown = (e) => {
    if (!abierto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      elegir(options[activo]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setAbierto(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={botonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onBlur={() => setAbierto(false)}
        onKeyDown={onKeyDown}
        className={`btn-plano ${claseCampo} flex items-center justify-between text-left ${abierto ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}
      >
        <span className={`truncate ${seleccionada ? '' : 'text-gray-400'}`}>
          {seleccionada ? seleccionada.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <ListaFlotante pos={pos} listaRef={listaRef} activo={activo}>
          {options.map((opcion, idx) => (
            <OpcionLista
              key={opcion.value}
              activa={idx === activo}
              seleccionada={opcion.value === value}
              onElegir={() => elegir(opcion)}
              onHover={() => setActivo(idx)}
            >
              {opcion.label}
            </OpcionLista>
          ))}
        </ListaFlotante>
      )}
    </div>
  );
}
