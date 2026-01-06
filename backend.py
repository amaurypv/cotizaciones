import sqlite3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from datetime import datetime

app = FastAPI()

# Configurar CORS para permitir peticiones desde el frontend (React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar el dominio exacto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "cotizaciones.db")

# --- Modelos Pydantic ---
class Cliente(BaseModel):
    nombre: str
    contacto: Optional[str] = ""
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    planta: Optional[str] = ""
    rfc: Optional[str] = ""

class ProductoCotizacion(BaseModel):
    clave: str
    descripcion: str
    cantidad: float
    unidad: str
    precio: float
    importe: float
    moneda: str = "M.N."
    presentacion: Optional[str] = ""
    proveedor: Optional[str] = ""
    costo: Optional[float] = 0.0

class Cotizacion(BaseModel):
    folio: str
    fecha: str
    cliente: Cliente
    productos: List[ProductoCotizacion]
    condiciones: dict
    terminos: Optional[str] = ""
    total: float

class ProductoCatalogo(BaseModel):
    clave: str
    descripcion: str
    precio: float
    unidad: str = "KILOGRAMO"
    moneda: str = "M.N."

# --- Funciones de Base de Datos ---
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Tabla Clientes
    c.execute('''CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE,
        contacto TEXT,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        planta TEXT,
        rfc TEXT
    )''')
    
    # Tabla Catalogo Productos
    c.execute('''CREATE TABLE IF NOT EXISTS catalogo_productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT UNIQUE,
        descripcion TEXT,
        precio REAL,
        unidad TEXT,
        moneda TEXT
    )''')
    
    # Tabla Cotizaciones
    c.execute('''CREATE TABLE IF NOT EXISTS cotizaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio TEXT UNIQUE,
        fecha TEXT,
        cliente_nombre TEXT,
        total REAL,
        terminos TEXT,
        validez TEXT,
        tiempo_entrega TEXT,
        condiciones_pago TEXT,
        created_at TEXT
    )''')
    
    # Tabla Items de Cotización
    c.execute('''CREATE TABLE IF NOT EXISTS cotizacion_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cotizacion_folio TEXT,
        clave TEXT,
        descripcion TEXT,
        cantidad REAL,
        unidad TEXT,
        precio REAL,
        importe REAL,
        moneda TEXT,
        presentacion TEXT,
        proveedor TEXT,
        costo REAL,
        FOREIGN KEY(cotizacion_folio) REFERENCES cotizaciones(folio)
    )''')
    
    conn.commit()
    conn.close()

# Inicializar DB al arrancar
init_db()

# --- Endpoints ---

@app.get("/clientes")
def get_clientes():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM clientes ORDER BY nombre")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/clientes")
def save_cliente(cliente: Cliente):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute('''INSERT OR REPLACE INTO clientes 
                     (nombre, contacto, telefono, email, direccion, planta, rfc) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (cliente.nombre, cliente.contacto, cliente.telefono, cliente.email, 
                   cliente.direccion, cliente.planta, cliente.rfc))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Cliente guardado"}

@app.get("/productos_catalogo")
def get_productos_catalogo():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM catalogo_productos ORDER BY clave")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/productos_catalogo")
def save_producto_catalogo(producto: ProductoCatalogo):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute('''INSERT OR REPLACE INTO catalogo_productos 
                     (clave, descripcion, precio, unidad, moneda) 
                     VALUES (?, ?, ?, ?, ?)''',
                  (producto.clave, producto.descripcion, producto.precio, 
                   producto.unidad, producto.moneda))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Producto guardado"}

@app.get("/cotizaciones")
def get_cotizaciones():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    # Query para obtener cotizaciones con costo total y proveedores concatenados
    c.execute("""
        SELECT 
            c.*, 
            SUM(ci.cantidad * ci.costo) as total_costo,
            GROUP_CONCAT(DISTINCT ci.proveedor) as proveedores,
            GROUP_CONCAT(DISTINCT ci.moneda) as monedas
        FROM cotizaciones c
        LEFT JOIN cotizacion_items ci ON c.folio = ci.cotizacion_folio
        GROUP BY c.id
        ORDER BY c.created_at DESC
    """)
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/cotizaciones/{folio}")
def get_cotizacion(folio: str):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Obtener cabecera
    c.execute("SELECT * FROM cotizaciones WHERE folio = ?", (folio,))
    cotizacion_row = c.fetchone()
    
    if not cotizacion_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    # Obtener items
    c.execute("SELECT * FROM cotizacion_items WHERE cotizacion_folio = ?", (folio,))
    items_rows = c.fetchall()
    
    # Obtener datos del cliente actualizados (opcional, pero útil)
    c.execute("SELECT * FROM clientes WHERE nombre = ?", (cotizacion_row['cliente_nombre'],))
    cliente_row = c.fetchone()
    
    conn.close()
    
    cotizacion_dict = dict(cotizacion_row)
    items_list = [dict(row) for row in items_rows]
    cliente_dict = dict(cliente_row) if cliente_row else {"nombre": cotizacion_row['cliente_nombre']}
    
    # Reconstruir estructura para el frontend
    return {
        "folio": cotizacion_dict['folio'],
        "fecha": cotizacion_dict['fecha'],
        "cliente": cliente_dict,
        "productos": items_list,
        "condiciones": {
            "validez": cotizacion_dict['validez'],
            "tiempoEntrega": cotizacion_dict['tiempo_entrega'],
            "condicionesPago": cotizacion_dict['condiciones_pago']
        },
        "terminos": cotizacion_dict['terminos'],
        "total": cotizacion_dict['total']
    }

@app.post("/cotizaciones")
def save_cotizacion(cotizacion: Cotizacion):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        # Guardar cliente primero (upsert)
        c.execute('''INSERT OR REPLACE INTO clientes 
                     (nombre, contacto, telefono, email, direccion, planta, rfc) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (cotizacion.cliente.nombre, cotizacion.cliente.contacto, cotizacion.cliente.telefono, 
                   cotizacion.cliente.email, cotizacion.cliente.direccion, cotizacion.cliente.planta, 
                   cotizacion.cliente.rfc))
        
        # Guardar cabecera de cotización
        created_at = datetime.now().isoformat()
        c.execute('''INSERT OR REPLACE INTO cotizaciones 
                     (folio, fecha, cliente_nombre, total, terminos, validez, tiempo_entrega, condiciones_pago, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (cotizacion.folio, cotizacion.fecha, cotizacion.cliente.nombre, cotizacion.total, 
                   cotizacion.terminos, cotizacion.condiciones['validez'], 
                   cotizacion.condiciones['tiempoEntrega'], cotizacion.condiciones['condicionesPago'], 
                   created_at))
        
        # Eliminar items anteriores si existen (para actualizaciones)
        c.execute("DELETE FROM cotizacion_items WHERE cotizacion_folio = ?", (cotizacion.folio,))
        
        # Guardar items
        for item in cotizacion.productos:
            c.execute('''INSERT INTO cotizacion_items 
                         (cotizacion_folio, clave, descripcion, cantidad, unidad, precio, importe, 
                          moneda, presentacion, proveedor, costo) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (cotizacion.folio, item.clave, item.descripcion, item.cantidad, item.unidad, 
                       item.precio, item.importe, item.moneda, item.presentacion, item.proveedor, item.costo))
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Error saving quotation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    conn.close()
    return {"message": "Cotización guardada exitosamente", "folio": cotizacion.folio}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
