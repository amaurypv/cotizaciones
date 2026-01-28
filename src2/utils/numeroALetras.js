export const numeroALetras = (numero, moneda = 'M.N.') => {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const monedaTexto = moneda === 'USD' ? 'DÓLARES' : 'PESOS';
  const monedaSufijo = moneda === 'USD' ? 'USD' : 'M.N.';

  if (numero === 0) return `CERO ${monedaTexto} 00/100 ${monedaSufijo}`;

  let entero = Math.floor(numero);
  const centavos = Math.round((numero - entero) * 100);

  const convertirGrupo = (n) => {
    let resultado = '';

    if (n >= 100) {
      const c = Math.floor(n / 100);
      if (n === 100) {
        resultado += 'CIEN ';
      } else {
        resultado += centenas[c] + ' ';
      }
      n %= 100;
    }

    if (n >= 20) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      resultado += decenas[d];
      if (u > 0) {
        resultado += ' Y ' + unidades[u];
      }
    } else if (n >= 10) {
      resultado += especiales[n - 10];
    } else if (n > 0) {
      resultado += unidades[n];
    }

    return resultado.trim();
  };

  let resultado = '';

  // Millones
  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    if (millones === 1) {
      resultado += 'UN MILLÓN ';
    } else {
      resultado += convertirGrupo(millones) + ' MILLONES ';
    }
    entero %= 1000000;
  }

  // Miles
  if (entero >= 1000) {
    const miles = Math.floor(entero / 1000);
    if (miles === 1) {
      resultado += 'MIL ';
    } else {
      resultado += convertirGrupo(miles) + ' MIL ';
    }
    entero %= 1000;
  }

  // Centenas, decenas y unidades
  if (entero > 0) {
    resultado += convertirGrupo(entero);
  }

  // Si no hay resultado, es cero
  if (!resultado.trim()) {
    resultado = 'CERO';
  }

  return `${resultado.trim()} ${monedaTexto} ${centavos.toString().padStart(2, '0')}/100 ${monedaSufijo}`;
};