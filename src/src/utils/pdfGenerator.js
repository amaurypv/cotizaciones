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
    doc.addImage(logoBase64, 'PNG', margins.left, y, 156, 39);
    y += 45;
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
  doc.text('DE LAS INDUSTRIAS 7301,A, NOMBRE DE DIOS, C.P.31110', margins.left, y);
  y += 12;
  doc.text('Chihuahua, Chihuahua, MÉXICO', margins.left, y);
  y += 12;
  doc.text('Tel: 6144819184 | Email: ventas@quimicaguba.com', margins.left, y);
  y += 15;

  // Cuadro de cotización en la derecha
  const boxWidth = 200;
  const boxHeight = 25; // Reducido para que solo contenga el título
  const boxX = margins.left + 330;
  const boxY = startY - 5;

  // Fondo azul
  doc.setFillColor(25, 50, 150);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');

  // Texto blanco - Título "Cotización" con Folio
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cotización ${quote.folio || 'COT0001-25'}`, boxX + 10, boxY + 16);

  // Fecha debajo del cuadro, alineada a la derecha
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const fecha = new Date(quote.fecha).toLocaleDateString('es-MX');
  const dateText = `Fecha: ${fecha}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, boxX + boxWidth - dateWidth, boxY + boxHeight + 15);

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
  const clientHeight = 55; // Ajustado ligeramente
  doc.rect(margins.left, y, contentWidth, clientHeight, 'D');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let clientY = y + 12;

  if (quote.customer?.rfc || quote.cliente?.rfc) {
    doc.setFont('helvetica', 'bold');
    doc.text(`RFC: ${quote.customer?.rfc || quote.cliente?.rfc || 'RFC POR DEFINIR'}`, margins.left + 5, clientY);
    clientY += 12;
  }

  if (quote.cliente?.nombre) {
    doc.setFont('helvetica', 'bold');
    doc.text(quote.cliente.nombre, margins.left + 5, clientY);
    clientY += 12;
  }

  doc.setFont('helvetica', 'normal');
  if (quote.cliente?.contacto) {
    doc.text(`Atención: ${quote.cliente.contacto}`, margins.left + 5, clientY);
    clientY += 12;
  }

  if (quote.cliente?.direccion) {
    const dirLines = doc.splitTextToSize(quote.cliente.direccion, contentWidth - 10);
    doc.text(dirLines, margins.left + 5, clientY);
    clientY += (dirLines.length * 10);
  }

  if (quote.cliente?.planta) {
    doc.text(`Planta: ${quote.cliente.planta}`, margins.left + 300, y + 48); // Alineación Planta específica
  }

  return y + clientHeight + 15;
};

// Función para agregar tabla de productos
const addProductsTable = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;

  // Headers de la tabla (Sincronizado con PDFTemplate)
  const rowHeight = 20;
  const columns = [
    { title: 'Clave', width: 60 },
    { title: 'Cantidad', width: 60 },
    { title: 'Unidad', width: 70 },
    { title: 'Descripción', width: 230 }, // Más ancho al eliminar Presentación
    { title: 'Precio', width: 60 },
    { title: 'Importe', width: 80 }
  ];

  // Header de la tabla
  doc.setFillColor(230, 230, 230); // Ligeramente más claro
  doc.setDrawColor(0, 0, 0);
  doc.rect(margins.left, y, contentWidth, rowHeight, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  let x = margins.left;
  columns.forEach((col, index) => {
    const align = (index >= 4) ? 'right' : 'center'; // Precio e Importe a la derecha
    const xPos = (index >= 4) ? x + col.width - 5 : x + (col.width / 2);
    doc.text(col.title, xPos, y + 13, { align: align });
    x += col.width;
  });

  y += rowHeight;

  // Filas de productos
  quote.productos.forEach(producto => {
    doc.setFont('helvetica', 'normal');

    // Preparar descripción con presentación integrada
    const descText = producto.descripcion || '';
    const presentacionText = producto.presentacion ? `Presentación: ${producto.presentacion}` : '';

    const descLines = doc.splitTextToSize(descText, columns[3].width - 10);
    const presLines = presentacionText ? doc.splitTextToSize(presentacionText, columns[3].width - 10) : [];

    const numLines = descLines.length + presLines.length;
    const dynamicRowHeight = Math.max(rowHeight, 12 + (numLines * 10));

    doc.setDrawColor(0, 0, 0);
    doc.rect(margins.left, y, contentWidth, dynamicRowHeight, 'D');

    x = margins.left;

    // Clave
    doc.text(producto.clave || '', x + (columns[0].width / 2), y + 12, { align: 'center' });
    x += columns[0].width;

    // Cantidad
    doc.text(producto.cantidad.toString(), x + (columns[1].width / 2), y + 12, { align: 'center' });
    x += columns[1].width;

    // Unidad
    doc.text(producto.unidad || '', x + (columns[2].width / 2), y + 12, { align: 'center' });
    x += columns[2].width;

    // Descripción integrada
    doc.text(descLines, x + 5, y + 10);
    if (presentacionText) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.text(presLines, x + 5, y + 10 + (descLines.length * 10));
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
    }
    x += columns[3].width;

    // Precio
    doc.text(`$${parseFloat(producto.precio || 0).toFixed(2)}`, x + columns[4].width - 5, y + 12, { align: 'right' });
    x += columns[4].width;

    // Importe
    doc.text(`$${producto.importe.toFixed(2)}`, x + columns[5].width - 5, y + 12, { align: 'right' });

    y += dynamicRowHeight;
  });

  return y;
};

// Función para agregar totales (Reestructurada para integrarse con la tabla)
const addTotals = (doc, margins, startY, totals, numeroALetras, contentWidth, quote) => {
  let y = startY;
  const leftColWidth = 450; // Suma de Clave + Cantidad + Unidad + Descripción + Precio
  const rightColWidth = 80;  // Ancho de la columna Importe

  // Determinar la moneda
  const moneda = quote.productos && quote.productos.length > 0
    ? quote.productos[0].moneda
    : 'M.N.';

  doc.setDrawColor(0, 0, 0);
  doc.setFontSize(8);

  // Fila Subtotal
  doc.rect(margins.left, y, contentWidth - rightColWidth, 20, 'D');
  doc.rect(margins.left + contentWidth - rightColWidth, y, rightColWidth, 20, 'D');

  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal', margins.left + contentWidth - rightColWidth - 5, y + 13, { align: 'right' });
  doc.text(`$${totals.subtotal.toFixed(2)}`, margins.left + contentWidth - 5, y + 13, { align: 'right' });

  // Cantidad con letra integrada en el lado izquierdo
  doc.text('Cantidad con letra', margins.left + 5, y + 13);
  doc.setFont('helvetica', 'normal');
  const cantidadLetras = numeroALetras(totals.total, moneda);
  const letterLines = doc.splitTextToSize(cantidadLetras, leftColWidth - 100);
  doc.text(letterLines, margins.left + 5, y + 25);

  y += 20;

  // Fila IVA
  doc.rect(margins.left + contentWidth - rightColWidth * 2, y, rightColWidth, 20, 'D');
  doc.rect(margins.left + contentWidth - rightColWidth, y, rightColWidth, 20, 'D');
  doc.setFont('helvetica', 'bold');
  doc.text('(+) IVA %16', margins.left + contentWidth - rightColWidth - 5, y + 13, { align: 'right' });
  doc.text(`$${totals.iva.toFixed(2)}`, margins.left + contentWidth - 5, y + 13, { align: 'right' });

  y += 20;

  // Fila TOTAL
  doc.rect(margins.left + contentWidth - rightColWidth * 2, y, rightColWidth, 25, 'D');
  doc.rect(margins.left + contentWidth - rightColWidth, y, rightColWidth, 25, 'D');
  doc.setFontSize(10);
  doc.text('TOTAL', margins.left + contentWidth - rightColWidth - 5, y + 16, { align: 'right' });
  doc.text(`$${totals.total.toFixed(2)}`, margins.left + contentWidth - 5, y + 16, { align: 'right' });

  return y + 40;
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

  doc.setLineHeightFactor(1.1);
  conditions.forEach(condition => {
    doc.text(condition, margins.left, y);
    y += 10;
  });

  return y + 5;
};

// Función para agregar términos y observaciones
const addTermsAndObservations = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Términos y observaciones', margins.left, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  const terminosLines = doc.splitTextToSize(quote.terminos || '', contentWidth - 10);
  doc.text(terminosLines, margins.left, y);
  y += (terminosLines.length * 10) + 5;

  doc.text('P=PORRÓN T=TAMBOR C=CONTENEDOR O TOTE S=SACO E=ENVASE CB=CUBETA', margins.left, y);

  return y + 15;
};

// Función para agregar contacto y firmas
const addContactAndSignatures = (doc, margins, startY, quote, contentWidth) => {
  let y = startY;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Agradecimiento centrado
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

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

  y += 35; // Espacio para las firmas

  // Líneas de firma
  const signatureWidth = 180;
  const leftSignatureX = margins.left + 20;
  const rightSignatureX = pageWidth - margins.right - signatureWidth - 20;

  // Líneas
  doc.setLineWidth(0.5);
  doc.line(leftSignatureX, y, leftSignatureX + signatureWidth, y);
  doc.line(rightSignatureX, y, rightSignatureX + signatureWidth, y);

  // Textos de firma
  y += 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const firmaVendedor = 'Firma vendedor';
  const vendedorWidth = doc.getTextWidth(firmaVendedor);
  doc.text(firmaVendedor, leftSignatureX + (signatureWidth - vendedorWidth) / 2, y);

  const clienteName = quote.cliente?.nombre || 'CLIENTE';
  const truncatedClienteName = clienteName.length > 35 ? clienteName.substring(0, 35) + '...' : clienteName;
  const clienteWidth = doc.getTextWidth(truncatedClienteName);
  doc.text(truncatedClienteName, rightSignatureX + (signatureWidth - clienteWidth) / 2, y);

  y += 10;
  doc.setFont('helvetica', 'normal');

  const quimicaGuba = 'QUÍMICA GUBA';
  const gubaWidth = doc.getTextWidth(quimicaGuba);
  doc.text(quimicaGuba, leftSignatureX + (signatureWidth - gubaWidth) / 2, y);

  const firmaAuth = 'Firma Autorización';
  const authWidth = doc.getTextWidth(firmaAuth);
  doc.text(firmaAuth, rightSignatureX + (signatureWidth - authWidth) / 2, y);
};