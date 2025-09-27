import React, { forwardRef } from 'react';

const PDFTemplate = forwardRef(({ quote, totals, numeroALetras }, ref) => {
  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div ref={ref} className="bg-white font-sans text-sm leading-none" style={{
      fontFamily: 'Arial, sans-serif',
      minHeight: '297mm',
      width: '210mm',
      paddingTop: '47px',    // 1.25cm
      paddingBottom: '47px', // 1.25cm
      paddingLeft: '56px',   // 1.5cm
      paddingRight: '56px'   // 1.5cm
    }}>
      {/* Header empresarial */}
      <div className="border-b border-blue-900 pb-1 mb-2">
        <div className="flex justify-between items-start">
          <div className="w-1/2">
            <h1 className="text-sm font-bold text-blue-900 mb-0">QUÍMICA INDUSTRIAL AVANZADA GUBA</h1>
            <div className="text-xs text-gray-700 leading-none">
              <p className="mb-0"><strong>QIA1004237M9</strong> | <strong>601 - General de Ley Personas Morales</strong></p>
              <p className="mb-0">DE LAS INDUSTRIAS 7301,A, NOMBRE DE DIOS, C.P.31110, Chihuahua, Chihuahua, MÉXICO</p>
              <p className="mb-0"><strong>Tel:</strong> 6144819184 | <strong>Email:</strong> ventas@quimicaguba.com</p>
            </div>
          </div>

          <div className="w-1/2 text-right">
            <div className="bg-blue-900 text-white p-1 rounded">
              <h2 className="text-sm font-bold">Cotización {quote.folio || 'COT0001-25'}</h2>
            </div>
            <div className="mt-1 text-xs">
              <p><strong>Fecha:</strong> {new Date(quote.fecha).toLocaleDateString('es-MX')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div className="border border-black mb-2">
        <div className="bg-gray-200 p-1 font-bold text-sm">
          Cliente:
        </div>
        <div className="p-1 text-xs leading-none">
          <p className="mb-0"><strong>{quote.cliente.rfc || 'RFC POR DEFINIR'}</strong></p>
          <p className="mb-0"><strong>{quote.cliente.nombre}</strong></p>
          {quote.cliente.contacto && <p className="mb-0">Atención: {quote.cliente.contacto}</p>}
          {quote.cliente.direccion && <p className="mb-0">{quote.cliente.direccion}</p>}
          {quote.cliente.planta && <p className="mb-0">Planta: {quote.cliente.planta}</p>}
        </div>
      </div>

      {/* Tabla de productos */}
      <table className="w-full border-collapse border border-black mb-2 text-xs">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black p-2 text-center font-bold">Clave</th>
            <th className="border border-black p-2 text-center font-bold">Cantidad</th>
            <th className="border border-black p-2 text-center font-bold">Unidad</th>
            <th className="border border-black p-2 text-center font-bold">Descripción</th>
            <th className="border border-black p-2 text-center font-bold">Precio</th>
            <th className="border border-black p-2 text-center font-bold">Importe</th>
          </tr>
        </thead>
        <tbody>
          {quote.productos.map((producto, index) => (
            <tr key={index}>
              <td className="border border-black p-2 text-center">{producto.clave || `Q${(index + 1).toString().padStart(3, '0')}`}</td>
              <td className="border border-black p-2 text-center">{producto.cantidad}</td>
              <td className="border border-black p-2 text-center">{producto.unidad}</td>
              <td className="border border-black p-2">
                {producto.descripcion}
                {producto.presentacion && (
                  <div className="text-gray-600 text-xs">
                    Presentación: {producto.presentacion}
                  </div>
                )}
              </td>
              <td className="border border-black p-2 text-right">${parseFloat(producto.precio || 0).toFixed(2)}</td>
              <td className="border border-black p-2 text-right">${producto.importe.toFixed(2)}</td>
            </tr>
          ))}

          {/* Filas de totales */}
          <tr>
            <td colSpan="4" className="border border-black p-2">
              <div className="font-bold">Cantidad con letra</div>
              <div className="text-xs mt-1">{numeroALetras(totals.total)}</div>
            </td>
            <td className="border border-black p-2 text-right font-bold">Subtotal</td>
            <td className="border border-black p-2 text-right font-bold">${totals.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan="4" className="border border-black p-2"></td>
            <td className="border border-black p-2 text-right font-bold">(+) IVA %16</td>
            <td className="border border-black p-2 text-right font-bold">${totals.iva.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan="4" className="border border-black p-2"></td>
            <td className="border border-black p-2 text-right font-bold text-lg">TOTAL</td>
            <td className="border border-black p-2 text-right font-bold text-lg">${totals.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Condiciones de venta */}
      <div className="mb-3 text-xs">
        <h3 className="font-bold mb-1">CONDICIONES DE VENTA:</h3>
        <div className="leading-none">
          1.- Precios mas I.V.A<br/>
          2.- Condiciones de pago: {quote.condiciones?.condicionesPago || '30 dias fecha factura'}<br/>
          3.- Si le es útil el precio, favor de enviar orden de compra, para surtir su pedido.<br/>
          4.- Tiempo de entrega: {quote.condiciones?.tiempoEntrega || 'Inmediata'}<br/>
          5.- Validez de la cotización: {quote.condiciones?.validez || '30'} días
        </div>
      </div>

      {/* Términos y observaciones */}
      {quote.terminos && (
        <div className="mb-3 text-xs">
          <h3 className="font-bold mb-1">Términos y observaciones</h3>
          <div className="leading-none">
            {quote.terminos}<br/>
            P=PORRÓN T=TAMBOR C=CONTENEDOR O TOTE S=SACO E=ENVASE CB=CUBETA
          </div>
        </div>
      )}

      {/* Agradecimiento */}
      <div className="mb-3 text-xs text-center">
        <p className="mb-0">Agradeciendo de antemano su preferencia, quedo a sus órdenes para cualquier aclaración.</p>
        <p className="mb-0">Cordialmente,</p>
      </div>

      {/* Información de contacto del vendedor */}
      <div className="mb-2 text-xs leading-tight text-center">
        <p className="mb-0"><strong>Amaury Pérez Verdejo</strong></p>
        <p className="mb-0">Ventas</p>
        <p className="mb-0">Tel./Fax. (614)481-91-84</p>
        <p className="mb-0">Cel. (614)121-1388</p>
        <p className="mb-0">ventas@quimicaguba.com</p>
        <p className="mb-0">www.quimicaguba.com</p>
      </div>

      {/* Sección de firmas */}
      <div className="flex justify-between mt-6">
        <div className="w-1/2 pr-4">
          <div className="text-center">
            <div className="border-t border-black w-48 mx-auto mb-2"></div>
            <p className="text-xs font-bold">Firma vendedor</p>
            <p className="text-xs">QUÍMICA GUBA</p>
          </div>
        </div>
        <div className="w-1/2 pl-4">
          <div className="text-center">
            <div className="border-t border-black w-48 mx-auto mb-2"></div>
            <p className="text-xs font-bold">{quote.cliente.nombre || 'CLIENTE'}</p>
            <p className="text-xs">Firma Autorización</p>
          </div>
        </div>
      </div>
    </div>
  );
});

PDFTemplate.displayName = 'PDFTemplate';

export default PDFTemplate;