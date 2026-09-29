import { useState, useLayoutEffect } from 'react';

const ALTO_LISTA = 288; // max-h-72

// Calcula dónde dibujar la lista flotante junto a su ancla. Usa coordenadas de
// viewport (position: fixed) porque la tabla de productos tiene scroll
// horizontal y una lista absoluta quedaría recortada. Si no cabe abajo, abre
// hacia arriba.
export function usePosicionFlotante(anclaRef, abierto, anchoMinimo = 0) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!abierto) return;
    const actualizar = () => {
      if (!anclaRef.current) return;
      const r = anclaRef.current.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - r.bottom;
      const haciaArriba = espacioAbajo < ALTO_LISTA + 8 && r.top > espacioAbajo;
      setPos({
        left: r.left,
        width: Math.max(r.width, anchoMinimo),
        ...(haciaArriba
          ? { bottom: window.innerHeight - r.top + 4 }
          : { top: r.bottom + 4 }),
      });
    };
    actualizar();
    window.addEventListener('scroll', actualizar, true);
    window.addEventListener('resize', actualizar);
    return () => {
      window.removeEventListener('scroll', actualizar, true);
      window.removeEventListener('resize', actualizar);
    };
  }, [abierto, anclaRef, anchoMinimo]);

  return pos;
}
