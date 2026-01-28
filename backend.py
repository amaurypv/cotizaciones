import sqlite3
from fastapi import FastAPI, HTTPException, Depends, status, Request
import time
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import uvicorn
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env si existe
load_dotenv()

# --- Configuración de Seguridad ---
# En una app real, estas variables vendrían de .env
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "guba_super_secret_key_change_me_en_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# Configurar CORS restringido para producción
ALLOWED_ORIGINS = [
    "https://cotizacionesguba.work",
    "https://www.cotizacionesguba.work",
    "http://localhost:5173",  # Para debugging local si es necesario
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Almacenamiento simple para límite de intentos (IP: [intentos, último_intento])
login_attempts = {}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "cotizaciones.db")

# --- Modelos Pydantic ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    password: str

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
    proveedor: Optional[str] = ""
    costo: Optional[float] = 0.0

# --- Utilidades de Seguridad ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT username FROM usuarios WHERE username = ?", (token_data.username,))
    user = c.fetchone()
    conn.close()
    
    if user is None:
        raise credentials_exception
    return user[0]

# --- Funciones de Base de Datos ---
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Tabla Usuarios
    c.execute('''CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )''')
    
    # Crear usuario por defecto si no existe (admin / admin_guba_2026)
    c.execute("SELECT * FROM usuarios WHERE username = 'admin'")
    if not c.fetchone():
        hashed_pw = get_password_hash("admin_guba_2026")
        c.execute("INSERT INTO usuarios (username, password) VALUES (?, ?)", ("admin", hashed_pw))

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
        moneda TEXT,
        proveedor TEXT,
        costo REAL
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

# --- Endpoints de Autenticación ---

@app.post("/token", response_model=Token)
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    client_ip = request.client.host
    now = time.time()

    # Verificar límite de intentos
    if client_ip in login_attempts:
        attempts, last_time = login_attempts[client_ip]
        if attempts >= 5 and (now - last_time) < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Por seguridad, intente de nuevo en 1 minuto."
            )
        if (now - last_time) >= 60:
            login_attempts[client_ip] = [0, now]

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT username, password FROM usuarios WHERE username = ?", (form_data.username,))
    user = c.fetchone()
    conn.close()
    
    if not user or not verify_password(form_data.password, user[1]):
        # Registrar intento fallido
        attempts, _ = login_attempts.get(client_ip, [0, now])
        login_attempts[client_ip] = [attempts + 1, now]
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Si el login es exitoso, resetear intentos para esta IP
    login_attempts[client_ip] = [0, now]
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user[0]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Endpoints Protegidos ---

@app.get("/clientes")
def get_clientes(current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM clientes ORDER BY nombre")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/clientes")
def save_cliente(cliente: Cliente, current_user: str = Depends(get_current_user)):
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
def get_productos_catalogo(current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM catalogo_productos ORDER BY clave")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/productos_catalogo")
def save_producto_catalogo(producto: ProductoCatalogo, current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute('''INSERT OR REPLACE INTO catalogo_productos 
                     (clave, descripcion, precio, unidad, moneda, proveedor, costo) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (producto.clave, producto.descripcion, producto.precio, 
                   producto.unidad, producto.moneda, producto.proveedor, producto.costo))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Producto guardado"}

@app.get("/cotizaciones")
def get_cotizaciones(current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT 
            c.*, 
            SUM(ci.cantidad * ci.costo) as total_costo,
            GROUP_CONCAT(ci.descripcion, ', ') as productos_resumen,
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
def get_cotizacion(folio: str, current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM cotizaciones WHERE folio = ?", (folio,))
    cotizacion_row = c.fetchone()
    
    if not cotizacion_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    c.execute("SELECT * FROM cotizacion_items WHERE cotizacion_folio = ?", (folio,))
    items_rows = c.fetchall()
    
    c.execute("SELECT * FROM clientes WHERE nombre = ?", (cotizacion_row['cliente_nombre'],))
    cliente_row = c.fetchone()
    
    conn.close()
    
    cotizacion_dict = dict(cotizacion_row)
    items_list = [dict(row) for row in items_rows]
    cliente_dict = dict(cliente_row) if cliente_row else {"nombre": cotizacion_row['cliente_nombre']}
    
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
def save_cotizacion(cotizacion: Cotizacion, current_user: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute('''INSERT OR REPLACE INTO clientes 
                     (nombre, contacto, telefono, email, direccion, planta, rfc) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (cotizacion.cliente.nombre, cotizacion.cliente.contacto, cotizacion.cliente.telefono, 
                   cotizacion.cliente.email, cotizacion.cliente.direccion, cotizacion.cliente.planta, 
                   cotizacion.cliente.rfc))
        
        created_at = datetime.now().isoformat()
        c.execute('''INSERT OR REPLACE INTO cotizaciones 
                     (folio, fecha, cliente_nombre, total, terminos, validez, tiempo_entrega, condiciones_pago, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (cotizacion.folio, cotizacion.fecha, cotizacion.cliente.nombre, cotizacion.total, 
                   cotizacion.terminos, cotizacion.condiciones['validez'], 
                   cotizacion.condiciones['tiempoEntrega'], cotizacion.condiciones['condicionesPago'], 
                   created_at))
        
        c.execute("DELETE FROM cotizacion_items WHERE cotizacion_folio = ?", (cotizacion.folio,))
        
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
