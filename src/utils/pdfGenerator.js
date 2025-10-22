import jsPDF from 'jspdf';

// Función auxiliar para cargar imagen como base64
const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const generateNativePDF = async (quote, totals, numeroALetras) => {
  // Cargar el logo
  let logoBase64 = null;
  try {
    logoBase64 = await loadImageAsBase64('/LOGO GUBA.png');
  } catch (error) {
    console.warn('No se pudo cargar el logo, se usará texto alternativo');
  }

  // Crear documento PDF en formato carta
  const doc = new jsPDF('portrait', 'pt', 'letter');

  // Configurar fuentes
  doc.setFont('helvetica');

  // Márgenes (convertidos de cm a puntos: 1cm = 28.35pt)
  const margins = {
    top: 35,    // ~1.25cm
    bottom: 35, // ~1.25cm
    left: 42,   // ~1.5cm
    right: 42   // ~1.5cm
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margins.left - margins.right;
  let currentY = margins.top;

  // Header de la empresa
  currentY = addCompanyHeader(doc, margins, currentY, quote, logoBase64);

  // Información del cliente
  currentY = addClientInfo(doc, margins, currentY, quote, contentWidth);

  // Tabla de productos
  currentY = addProductsTable(doc, margins, currentY, quote, contentWidth);

  // Totales
  currentY = addTotals(doc, margins, currentY, totals, numeroALetras, contentWidth, quote);

  // Condiciones de venta
  currentY = addSalesConditions(doc, margins, currentY, quote, contentWidth);

  // Términos y observaciones
  if (quote.terminos) {
    currentY = addTermsAndObservations(doc, margins, currentY, quote, contentWidth);
  }

  // Información de contacto y firmas
  addContactAndSignatures(doc, margins, currentY, quote, contentWidth);

  return doc;
};

// Función para agregar header de la empresa
const addCompanyHeader = (doc, margins, startY, quote, logoBase64) => {
  let y = startY;

  // Logo de la empresa o texto alternativo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margins.left, y, 120, 30);
    y += 35;
  } else {
    // Si no hay logo, usar el texto
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 50, 150);
    doc.text('QUÍMICA INDUSTRIAL AVANZADA GUBA', margins.left, y);
    y += 20;
  }

  // Información fiscal y dirección en líneas compactas
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100); // Gris
  doc.text('QIA1004237M9 | 601 - General de Ley Personas Morales', margins.left, y);
  y += 12;
  doc.text('DE LAS INDUSTRIAS 7301,A, NOMBRE DE DIOS, C.P.31110, Chihuahua, Chihuahua, MÉXICO', margins.left, y);
  y += 12;
  doc.text('Tel: 6144819184 | Email: ventas@quimicaguba.com', margins.left, y);
  y += 15;

  // Cuadro de cotización en la derecha
  const boxWidth = 200;
  const boxHeight = 50;
  const boxX = margins.left + 330;
  const boxY = startY - 5;

  // Fondo azul
  doc.setFillColor(25, 50, 150);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');

  // Texto blanco - Título "Cotización"
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN', boxX + 10, boxY + 12);

  // Folio dentro del cuadro
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const folioLines = doc.splitTextToSize(quote.folio || 'COT0001-25', boxWidth - 20);
  doc.text(folioLines, boxX + 10, boxY + 25);

  // Fecha dentro del cuadro
  doc.setFontSize(8);
  const fecha = new Date(quote.fecha).toLocaleDateString('es-MX');
  doc.text(`Fecha: ${fecha}`, boxX + 10, boxY + 42);

  // Restaurar color de texto a negro para el resto del documento
  doc.setTextColor(0, 0, 0);

  // Línea separadora
  y += 5;
  doc.setDrawColor(25, 50, 150);
  doc.setLineWidth(1);
  doc.line(margins.left, y, margins.left + 530, y);

  return y + 15;
};

// Función para agregar información del cliente
const addClientInfo = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;

  // Cuadro del cliente
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  // Header del cuadro
  doc.setFillColor(220, 220, 220);
  doc.rect(margins.left, y, contentWidth, 15, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', margins.left + 5, y + 10);
  y += 15;

  // Contenido del cliente
  const clientHeight = 30;
  doc.rect(margins.left, y, contentWidth, clientHeight, 'D');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let clientY = y + 10;

  if (quote.cliente.rfc) {
    doc.setFont('helvetica', 'bold');
    doc.text(quote.cliente.rfc, margins.left + 5, clientY);
    clientY += 10;
  }

  if (quote.cliente.nombre) {
    doc.setFont('helvetica', 'bold');
    doc.text(quote.cliente.nombre, margins.left + 5, clientY);
    clientY += 10;
  }

  doc.setFont('helvetica', 'normal');
  if (quote.cliente.contacto) {
    doc.text(`Atención: ${quote.cliente.contacto}`, margins.left + 5, clientY);
  }
  if (quote.cliente.planta) {
    doc.text(`Planta: ${quote.cliente.planta}`, margins.left + 300, clientY);
  }

  return y + clientHeight + 15;
};

// Función para agregar tabla de productos
const addProductsTable = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;

  // Headers de la tabla
  const rowHeight = 20;
  const columns = [
    { title: 'Clave', width: 50 },
    { title: 'Cantidad', width: 50 },
    { title: 'Unidad', width: 60 },
    { title: 'Descripción', width: 160 },
    { title: 'Presentación', width: 70 },
    { title: 'Precio', width: 60 },
    { title: 'Importe', width: 80 }
  ];

  // Header de la tabla
  doc.setFillColor(220, 220, 220);
  doc.rect(margins.left, y, contentWidth, rowHeight, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  let x = margins.left;
  columns.forEach(col => {
    doc.text(col.title, x + 5, y + 12);
    x += col.width;
  });

  y += rowHeight;

  // Filas de productos
  quote.productos.forEach(producto => {
    doc.setFont('helvetica', 'normal');

    // Calcular líneas necesarias para la descripción
    const descripcion = producto.descripcion || '';
    const descripcionLines = doc.splitTextToSize(descripcion, columns[3].width - 10);
    const numLines = descripcionLines.length;

    // Altura de fila dinámica (mínimo 20pt, 10pt por cada línea adicional)
    const dynamicRowHeight = Math.max(rowHeight, 15 + (numLines * 10));

    doc.setDrawColor(0, 0, 0);
    doc.rect(margins.left, y, contentWidth, dynamicRowHeight, 'D');

    x = margins.left;

    // Clave
    doc.text(producto.clave || '', x + 5, y + 12);
    x += columns[0].width;

    // Cantidad
    doc.text(producto.cantidad.toString(), x + 5, y + 12);
    x += columns[1].width;

    // Unidad
    doc.text(producto.unidad || '', x + 5, y + 12);
    x += columns[2].width;

    // Descripción (múltiples líneas)
    doc.text(descripcionLines, x + 5, y + 10);
    x += columns[3].width;

    // Presentación
    const presentacion = producto.presentacion || '';
    doc.text(presentacion, x + 5, y + 12);
    x += columns[4].width;

    // Precio
    doc.text(`$${parseFloat(producto.precio || 0).toFixed(2)}`, x + 5, y + 12);
    x += columns[5].width;

    // Importe
    doc.text(`$${producto.importe.toFixed(2)}`, x + 5, y + 12);

    y += dynamicRowHeight;
  });

  return y + 10;
};

// Función para agregar totales
const addTotals = (doc, margins, startY, totals, numeroALetras, contentWidth, quote) => {
  let y = startY;

  // Determinar la moneda de la cotización (usar la del primer producto)
  const moneda = quote.productos && quote.productos.length > 0
    ? quote.productos[0].moneda
    : 'M.N.';

  // Cantidad con letra
  const leftBoxWidth = 350;
  const rightBoxWidth = contentWidth - leftBoxWidth - 10;

  doc.setDrawColor(0, 0, 0);
  doc.rect(margins.left, y, leftBoxWidth, 60, 'D');
  doc.rect(margins.left + leftBoxWidth + 10, y, rightBoxWidth, 60, 'D');

  // Cantidad con letra
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Cantidad con letra', margins.left + 5, y + 12);

  doc.setFont('helvetica', 'normal');
  const cantidadLetras = numeroALetras(totals.total, moneda);
  const lines = doc.splitTextToSize(cantidadLetras, leftBoxWidth - 10);
  doc.text(lines, margins.left + 5, y + 25);

  // Totales
  const totalsX = margins.left + leftBoxWidth + 15;
  let totalsY = y + 15;

  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal', totalsX, totalsY);
  doc.text(`$${totals.subtotal.toFixed(2)}`, totalsX + 100, totalsY);
  totalsY += 15;

  doc.text('(+) IVA %16', totalsX, totalsY);
  doc.text(`$${totals.iva.toFixed(2)}`, totalsX + 100, totalsY);
  totalsY += 15;

  doc.setFontSize(10);
  doc.text('TOTAL', totalsX, totalsY);
  doc.text(`$${totals.total.toFixed(2)}`, totalsX + 100, totalsY);

  return y + 70;
};

// Función para agregar condiciones de venta
const addSalesConditions = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDICIONES DE VENTA:', margins.left, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  const conditions = [
    '1.- Precios mas I.V.A',
    `2.- Condiciones de pago: ${quote.condiciones?.condicionesPago || '30 dias fecha factura'}`,
    '3.- Si le es útil el precio, favor de enviar orden de compra, para surtir su pedido.',
    `4.- Tiempo de entrega: ${quote.condiciones?.tiempoEntrega || 'Inmediata'}`,
    `5.- Validez de la cotización: ${quote.condiciones?.validez || '30'} días`
  ];

  conditions.forEach(condition => {
    doc.text(condition, margins.left, y);
    y += 10;
  });

  return y + 10;
};

// Función para agregar términos y observaciones
const addTermsAndObservations = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Términos y observaciones', margins.left, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  // Dividir el texto en múltiples líneas si es necesario
  const terminosLines = doc.splitTextToSize(quote.terminos, contentWidth - 10);
  doc.text(terminosLines, margins.left, y);
  y += (terminosLines.length * 10) + 5;

  // Leyenda de presentaciones
  doc.text('P=PORRÓN T=TAMBOR C=CONTENEDOR O TOTE S=SACO E=ENVASE CB=CUBETA', margins.left, y);

  return y + 15;
};

// Función para agregar contacto y firmas
const addContactAndSignatures = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;

  // Agradecimiento centrado
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const pageWidth = doc.internal.pageSize.getWidth();

  const agradecimiento = 'Agradeciendo de antemano su preferencia, quedo a sus órdenes para cualquier aclaración.';
  const textWidth = doc.getTextWidth(agradecimiento);
  doc.text(agradecimiento, (pageWidth - textWidth) / 2, y);
  y += 12;

  const cordialmente = 'Cordialmente,';
  const cordialmenteWidth = doc.getTextWidth(cordialmente);
  doc.text(cordialmente, (pageWidth - cordialmenteWidth) / 2, y);
  y += 20;

  // Información de contacto centrada
  const contactInfo = [
    'Amaury Pérez Verdejo',
    'Ventas',
    'Tel./Fax. (614)481-91-84',
    'Cel. (614)121-1388',
    'ventas@quimicaguba.com',
    'www.quimicaguba.com'
  ];

  contactInfo.forEach((info, index) => {
    if (index === 0) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');

    const infoWidth = doc.getTextWidth(info);
    doc.text(info, (pageWidth - infoWidth) / 2, y);
    y += 10;
  });

  y += 20;

  // Líneas de firma
  const signatureWidth = 150;
  const leftSignatureX = margins.left + 50;
  const rightSignatureX = pageWidth - margins.right - signatureWidth - 50;

  // Líneas
  doc.setLineWidth(0.5);
  doc.line(leftSignatureX, y, leftSignatureX + signatureWidth, y);
  doc.line(rightSignatureX, y, rightSignatureX + signatureWidth, y);

  // Textos de firma
  y += 15;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');

  const firmaVendedor = 'Firma vendedor';
  const vendedorWidth = doc.getTextWidth(firmaVendedor);
  doc.text(firmaVendedor, leftSignatureX + (signatureWidth - vendedorWidth) / 2, y);

  const clienteName = quote.cliente.nombre || 'CLIENTE';
  const clienteWidth = doc.getTextWidth(clienteName);
  doc.text(clienteName, rightSignatureX + (signatureWidth - clienteWidth) / 2, y);

  y += 10;
  doc.setFont('helvetica', 'normal');

  const quimicaGuba = 'QUÍMICA GUBA';
  const gubaWidth = doc.getTextWidth(quimicaGuba);
  doc.text(quimicaGuba, leftSignatureX + (signatureWidth - gubaWidth) / 2, y);

  const firmaAuth = 'Firma Autorización';
  const authWidth = doc.getTextWidth(firmaAuth);
  doc.text(firmaAuth, rightSignatureX + (signatureWidth - authWidth) / 2, y);
};