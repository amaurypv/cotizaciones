import psycopg2
import psycopg2.extras
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

load_dotenv()

# --- Configuración de Seguridad ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "guba_super_secret_key_change_me_en_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
app = FastAPI()

# Configurar CORS
ALLOWED_ORIGINS = [
    "https://cotizacionesguba.work",
    "https://www.cotizacionesguba.work",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Puerto del preview configurado en .claude/launch.json
    "http://localhost:5174",
    "http://127.0.0.1:5174"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Almacenamiento simple para límite de intentos
login_attempts = {}

# --- Conexión a PostgreSQL (Supabase) ---
DB_HOST = os.getenv("DB_HOST", "db.msoyvphmznryoyjedmph.supabase.co")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

def get_conn():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    with conn.cursor() as c:
        c.execute("SET search_path TO cotizaciones")
    conn.commit()
    return conn

def ensure_schema():
    # Migraciones idempotentes
    conn = get_conn()
    with conn.cursor() as c:
        # Folio de la cotización que renovó a una vencida
        c.execute("ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS renovada_por TEXT")
        # Seguimiento de venta: qué partidas aceptó el cliente y cómo cerró la cotización.
        # 'aceptado' es tri-estado a propósito: NULL = sin decidir, distinto de FALSE = rechazada.
        c.execute("ALTER TABLE cotizacion_items ADD COLUMN IF NOT EXISTS aceptado BOOLEAN")
        c.execute("ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS fecha_cierre DATE")
        c.execute("ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS motivo_perdida TEXT")
        c.execute("ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS nota_cierre TEXT")
        # El vocabulario anterior no podía escribirse desde la UI, pero sí se capturó a mano
        # en Supabase. 'Aprobada' significaba que se aprobó la cotización completa, así que
        # se marcan todas sus partidas: si solo se renombrara el estatus, quedarían como
        # "Ganada · 0 de N partidas" y ensuciarían la conversión por partida.
        c.execute("""UPDATE cotizacion_items SET aceptado = TRUE
                     WHERE aceptado IS NULL AND cotizacion_folio IN (
                         SELECT folio FROM cotizaciones WHERE estatus = 'Aprobada')""")
        c.execute("""UPDATE cotizacion_items SET aceptado = FALSE
                     WHERE aceptado IS NULL AND cotizacion_folio IN (
                         SELECT folio FROM cotizaciones WHERE estatus = 'Rechazada')""")
        c.execute("UPDATE cotizaciones SET estatus = 'Ganada'  WHERE estatus = 'Aprobada'")
        c.execute("UPDATE cotizaciones SET estatus = 'Perdida' WHERE estatus = 'Rechazada'")
    conn.commit()
    conn.close()

try:
    ensure_schema()
except Exception as e:
    print(f"Advertencia: no se pudo verificar el esquema de la BD: {e}")

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

class CierreUpdate(BaseModel):
    accion: str = "cerrar"                 # 'cerrar' | 'reabrir'
    aceptados: List[int] = []              # ids de cotizacion_items que el cliente aceptó
    fecha_cierre: Optional[str] = None
    motivo_perdida: Optional[str] = ""
    nota_cierre: Optional[str] = ""
    estatus_abierto: str = "Enviada"       # estado al reabrir

class RenovadaUpdate(BaseModel):
    renovada_por: str

# --- Resultado de venta ---
ESTATUS_ABIERTOS = ("Enviada", "En negociación")

# Histórico sin resultado: sale de los avisos pero no cuenta como venta perdida.
ESTATUS_SIN_DATO = "Sin dato"

# La vigencia no está guardada: se deriva de fecha + validez (días). `validez` es TEXT,
# así que se limpia a dígitos antes de convertir para no reventar con valores raros.
SQL_VENCIMIENTO = ("(fecha::date + COALESCE("
                   "NULLIF(regexp_replace(validez, '\\D', '', 'g'), '')::int, 0))")

class ArchivarRequest(BaseModel):
    dias: int = 90

def derivar_estatus(total_items: int, aceptados: int) -> str:
    """El resultado de la cotización se deriva de sus partidas, no se captura aparte."""
    if total_items == 0 or aceptados == 0:
        return "Perdida"
    if aceptados >= total_items:
        return "Ganada"
    return "Ganada parcial"

# --- Utilidades de Seguridad ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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

    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute("SELECT username FROM usuarios WHERE username = %s", (token_data.username,))
    user = c.fetchone()
    conn.close()

    if user is None:
        raise credentials_exception
    return user["username"]

# --- Endpoints de Autenticación ---
@app.post("/token", response_model=Token)
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    client_ip = request.client.host
    now = time.time()
    if client_ip in login_attempts:
        attempts, last_time = login_attempts[client_ip]
        if attempts >= 5 and (now - last_time) < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Por seguridad, intente de nuevo en 1 minuto."
            )
        if (now - last_time) >= 60:
            login_attempts[client_ip] = [0, now]

    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute("SELECT username, password FROM usuarios WHERE username = %s", (form_data.username,))
    user = c.fetchone()
    conn.close()

    if not user or not verify_password(form_data.password, user["password"]):
        attempts, _ = login_attempts.get(client_ip, [0, now])
        login_attempts[client_ip] = [attempts + 1, now]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"}
        )

    login_attempts[client_ip] = [0, now]
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Endpoints Protegidos ---
@app.get("/clientes")
def get_clientes(current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute("SELECT * FROM clientes ORDER BY nombre")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/clientes")
def save_cliente(cliente: Cliente, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor()
    try:
        c.execute(
            '''INSERT INTO clientes (nombre, contacto, telefono, email, direccion, planta, rfc)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (nombre) DO UPDATE SET
                 contacto = EXCLUDED.contacto,
                 telefono = EXCLUDED.telefono,
                 email = EXCLUDED.email,
                 direccion = EXCLUDED.direccion,
                 planta = EXCLUDED.planta,
                 rfc = EXCLUDED.rfc''',
            (cliente.nombre, cliente.contacto, cliente.telefono,
             cliente.email, cliente.direccion, cliente.planta, cliente.rfc)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Cliente guardado"}

@app.get("/productos_catalogo")
def get_productos_catalogo(current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute("SELECT * FROM catalogo_productos ORDER BY clave")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/productos_catalogo")
def save_producto_catalogo(producto: ProductoCatalogo, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor()
    try:
        c.execute(
            '''INSERT INTO catalogo_productos (clave, descripcion, precio, unidad, moneda, proveedor, costo)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (clave) DO UPDATE SET
                 descripcion = EXCLUDED.descripcion,
                 precio = EXCLUDED.precio,
                 unidad = EXCLUDED.unidad,
                 moneda = EXCLUDED.moneda,
                 proveedor = EXCLUDED.proveedor,
                 costo = EXCLUDED.costo''',
            (producto.clave, producto.descripcion, producto.precio,
             producto.unidad, producto.moneda, producto.proveedor, producto.costo)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Producto guardado"}

@app.post("/cotizaciones/archivar")
def archivar_vencidas(data: ArchivarRequest, current_user: str = Depends(get_current_user)):
    """Marca como 'Sin dato' el histórico vencido hace mucho.

    No se marcan como Perdidas a propósito: muchas sí se vendieron y no hay forma de
    saberlo, así que contarlas como pérdidas hundiría la conversión con datos falsos.
    'Sin dato' las saca de los avisos y queda excluido de todo cálculo.
    """
    conn = get_conn()
    c = conn.cursor()
    try:
        c.execute(
            f"""UPDATE cotizaciones SET estatus = %s
                WHERE estatus = ANY(%s)
                  AND renovada_por IS NULL
                  AND {SQL_VENCIMIENTO} < CURRENT_DATE - %s""",
            (ESTATUS_SIN_DATO, list(ESTATUS_ABIERTOS), data.dias)
        )
        archivadas = c.rowcount
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Histórico archivado", "archivadas": archivadas, "dias": data.dias}

@app.get("/reportes/oportunidades")
def oportunidades(current_user: str = Depends(get_current_user)):
    """Clientes con cotizaciones vencidas sin cerrar, para re-cotizar.

    Se ordena por cuántas veces les has cotizado: un cliente recurrente con una
    cotización vencida y sin respuesta es una llamada pendiente, no un dato muerto.
    """
    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute(
        f"""SELECT cliente_nombre,
                   COUNT(*) FILTER (
                       WHERE estatus = ANY(%s) AND renovada_por IS NULL
                         AND {SQL_VENCIMIENTO} < CURRENT_DATE
                   ) AS vencidas_abiertas,
                   COUNT(*) AS total_cotizaciones,
                   MAX(fecha) AS ultima_cotizacion
            FROM cotizaciones
            GROUP BY cliente_nombre
            HAVING COUNT(*) FILTER (
                       WHERE estatus = ANY(%s) AND renovada_por IS NULL
                         AND {SQL_VENCIMIENTO} < CURRENT_DATE
                   ) > 0
            ORDER BY COUNT(*) DESC, MAX(fecha) DESC""",
        (list(ESTATUS_ABIERTOS), list(ESTATUS_ABIERTOS))
    )
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/reportes/conversion_productos")
def conversion_productos(current_user: str = Depends(get_current_user)):
    """Conversión por producto sobre cotizaciones ya cerradas.

    No se puede derivar del historial porque este no trae las partidas. Se excluyen
    las cotizaciones renovadas: fueron reemplazadas, no rechazadas por el cliente.
    """
    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute("""
        SELECT ci.clave,
               MAX(ci.descripcion) as descripcion,
               COUNT(*) as veces_cotizado,
               COUNT(*) FILTER (WHERE ci.aceptado) as veces_aceptado,
               SUM(ci.importe) FILTER (WHERE ci.aceptado) as monto_aceptado,
               SUM(ci.cantidad * ci.costo) FILTER (WHERE ci.aceptado) as costo_aceptado
        FROM cotizacion_items ci
        JOIN cotizaciones c ON c.folio = ci.cotizacion_folio
        WHERE ci.aceptado IS NOT NULL AND c.renovada_por IS NULL
        GROUP BY ci.clave
        ORDER BY COUNT(*) DESC, ci.clave
    """)
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/cotizaciones")
def get_cotizaciones(current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute("""
        SELECT c.*,
               SUM(ci.cantidad * ci.costo) as total_costo,
               STRING_AGG(ci.descripcion, ', ') as productos_resumen,
               STRING_AGG(DISTINCT ci.moneda, ',') as monedas,
               COUNT(ci.id) as items_total,
               COUNT(*) FILTER (WHERE ci.aceptado) as items_aceptados,
               SUM(ci.importe) FILTER (WHERE ci.aceptado) as monto_aceptado,
               SUM(ci.cantidad * ci.costo) FILTER (WHERE ci.aceptado) as costo_aceptado
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
    conn = get_conn()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    c.execute("SELECT * FROM cotizaciones WHERE folio = %s", (folio,))
    cotizacion_row = c.fetchone()
    if not cotizacion_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    c.execute("SELECT * FROM cotizacion_items WHERE cotizacion_folio = %s ORDER BY id", (folio,))
    items_rows = c.fetchall()
    c.execute("SELECT * FROM clientes WHERE nombre = %s", (cotizacion_row["cliente_nombre"],))
    cliente_row = c.fetchone()
    conn.close()
    cotizacion_dict = dict(cotizacion_row)
    items_list = [dict(row) for row in items_rows]
    cliente_dict = dict(cliente_row) if cliente_row else {"nombre": cotizacion_row["cliente_nombre"]}
    return {
        "folio": cotizacion_dict["folio"],
        "fecha": cotizacion_dict["fecha"],
        "cliente": cliente_dict,
        "productos": items_list,
        "condiciones": {
            "validez": cotizacion_dict["validez"],
            "tiempoEntrega": cotizacion_dict["tiempo_entrega"],
            "condicionesPago": cotizacion_dict["condiciones_pago"],
            "lugarEntrega": cotizacion_dict.get("lugar_entrega") or "",
            "garantia": cotizacion_dict.get("garantia") or ""
        },
        "terminos": cotizacion_dict["terminos"],
        "total": cotizacion_dict["total"],
        "estatus": cotizacion_dict.get("estatus", "Enviada")
    }

@app.delete("/cotizaciones/{folio}")
def delete_cotizacion(folio: str, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM cotizacion_items WHERE cotizacion_folio = %s", (folio,))
        c.execute("DELETE FROM cotizaciones WHERE folio = %s", (folio,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Cotización eliminada"}

@app.patch("/cotizaciones/{folio}/cierre")
def update_cierre(folio: str, data: CierreUpdate, current_user: str = Depends(get_current_user)):
    """Registra qué partidas aceptó el cliente y deriva el resultado de la cotización."""
    conn = get_conn()
    c = conn.cursor()
    try:
        if data.accion == "reabrir":
            estatus = data.estatus_abierto if data.estatus_abierto in ESTATUS_ABIERTOS else "Enviada"
            # Se limpian las marcas para no dejar rastro de un cierre revertido.
            c.execute("UPDATE cotizacion_items SET aceptado = NULL WHERE cotizacion_folio = %s", (folio,))
            c.execute(
                """UPDATE cotizaciones
                   SET estatus = %s, fecha_cierre = NULL, motivo_perdida = NULL, nota_cierre = NULL
                   WHERE folio = %s""",
                (estatus, folio)
            )
            # Las partidas siguen existiendo, solo quedan sin decidir.
            c.execute("SELECT COUNT(*) FROM cotizacion_items WHERE cotizacion_folio = %s", (folio,))
            total_items = c.fetchone()[0]
            aceptados = 0
            monto_aceptado = 0
            costo_aceptado = 0
        else:
            c.execute("SELECT id FROM cotizacion_items WHERE cotizacion_folio = %s", (folio,))
            ids = [row[0] for row in c.fetchall()]
            if not ids:
                conn.rollback()
                conn.close()
                raise HTTPException(status_code=404, detail="La cotización no tiene partidas")

            marcados = set(data.aceptados) & set(ids)
            c.execute(
                "UPDATE cotizacion_items SET aceptado = (id = ANY(%s)) WHERE cotizacion_folio = %s",
                (list(marcados), folio)
            )

            total_items = len(ids)
            aceptados = len(marcados)
            estatus = derivar_estatus(total_items, aceptados)
            fecha_cierre = data.fecha_cierre or datetime.now().strftime("%Y-%m-%d")
            # El motivo solo aplica cuando quedó algo sin vender.
            motivo = data.motivo_perdida if aceptados < total_items else None
            nota = data.nota_cierre or None

            c.execute(
                """UPDATE cotizaciones
                   SET estatus = %s, fecha_cierre = %s, motivo_perdida = %s, nota_cierre = %s
                   WHERE folio = %s""",
                (estatus, fecha_cierre, motivo, nota, folio)
            )

            # Se devuelven los montos ya agregados para que el frontend actualice su
            # estado sin tener que recargar todo el historial.
            c.execute(
                """SELECT COALESCE(SUM(importe), 0), COALESCE(SUM(cantidad * costo), 0)
                   FROM cotizacion_items WHERE cotizacion_folio = %s AND aceptado""",
                (folio,)
            )
            monto_aceptado, costo_aceptado = c.fetchone()
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Cierre registrado", "estatus": estatus,
            "items_total": total_items, "items_aceptados": aceptados,
            "monto_aceptado": float(monto_aceptado), "costo_aceptado": float(costo_aceptado)}

@app.patch("/cotizaciones/{folio}/renovada")
def update_renovada(folio: str, data: RenovadaUpdate, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor()
    try:
        c.execute("UPDATE cotizaciones SET renovada_por = %s WHERE folio = %s", (data.renovada_por, folio))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Cotización marcada como renovada"}

@app.post("/cotizaciones")
def save_cotizacion(cotizacion: Cotizacion, current_user: str = Depends(get_current_user)):
    conn = get_conn()
    c = conn.cursor()
    try:
        c.execute(
            '''INSERT INTO clientes (nombre, contacto, telefono, email, direccion, planta, rfc)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (nombre) DO UPDATE SET
                 contacto = EXCLUDED.contacto,
                 telefono = EXCLUDED.telefono,
                 email = EXCLUDED.email,
                 direccion = EXCLUDED.direccion,
                 planta = EXCLUDED.planta,
                 rfc = EXCLUDED.rfc''',
            (cotizacion.cliente.nombre, cotizacion.cliente.contacto,
             cotizacion.cliente.telefono, cotizacion.cliente.email,
             cotizacion.cliente.direccion, cotizacion.cliente.planta,
             cotizacion.cliente.rfc)
        )
        created_at = datetime.now().isoformat()
        c.execute(
            '''INSERT INTO cotizaciones (folio, fecha, cliente_nombre, total, terminos, validez, tiempo_entrega, condiciones_pago, lugar_entrega, garantia, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (folio) DO UPDATE SET
                 fecha = EXCLUDED.fecha,
                 cliente_nombre = EXCLUDED.cliente_nombre,
                 total = EXCLUDED.total,
                 terminos = EXCLUDED.terminos,
                 validez = EXCLUDED.validez,
                 tiempo_entrega = EXCLUDED.tiempo_entrega,
                 condiciones_pago = EXCLUDED.condiciones_pago,
                 lugar_entrega = EXCLUDED.lugar_entrega,
                 garantia = EXCLUDED.garantia,
                 created_at = EXCLUDED.created_at''',
            (cotizacion.folio, cotizacion.fecha, cotizacion.cliente.nombre,
             cotizacion.total, cotizacion.terminos,
             cotizacion.condiciones["validez"],
             cotizacion.condiciones["tiempoEntrega"],
             cotizacion.condiciones["condicionesPago"],
             cotizacion.condiciones.get("lugarEntrega", ""),
             cotizacion.condiciones.get("garantia", ""),
             created_at)
        )
        # Las partidas se borran y reinsertan, así que hay que rescatar las marcas de
        # aceptación primero o reeditar una cotización ya cerrada las borraría en silencio.
        # Se emparejan por clave+descripción porque los ids se regeneran; se guarda una
        # lista por llave para no confundir partidas repetidas con distinta presentación.
        c.execute(
            """SELECT clave, descripcion, aceptado FROM cotizacion_items
               WHERE cotizacion_folio = %s ORDER BY id""",
            (cotizacion.folio,)
        )
        marcas_previas = {}
        for clave, descripcion, aceptado in c.fetchall():
            marcas_previas.setdefault((clave, descripcion), []).append(aceptado)

        c.execute("DELETE FROM cotizacion_items WHERE cotizacion_folio = %s", (cotizacion.folio,))
        for item in cotizacion.productos:
            pendientes = marcas_previas.get((item.clave, item.descripcion))
            aceptado = pendientes.pop(0) if pendientes else None
            c.execute(
                '''INSERT INTO cotizacion_items
                   (cotizacion_folio, clave, descripcion, cantidad, unidad, precio, importe, moneda, presentacion, proveedor, costo, aceptado)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                (cotizacion.folio, item.clave, item.descripcion, item.cantidad,
                 item.unidad, item.precio, item.importe, item.moneda,
                 item.presentacion, item.proveedor, item.costo, aceptado)
            )

        # El conjunto de partidas pudo cambiar, así que el resultado se recalcula.
        c.execute(
            """SELECT COUNT(*), COUNT(*) FILTER (WHERE aceptado) FROM cotizacion_items
               WHERE cotizacion_folio = %s AND aceptado IS NOT NULL""",
            (cotizacion.folio,)
        )
        decididas, aceptadas = c.fetchone()
        if decididas:
            c.execute("SELECT COUNT(*) FROM cotizacion_items WHERE cotizacion_folio = %s",
                      (cotizacion.folio,))
            total_items = c.fetchone()[0]
            c.execute("UPDATE cotizaciones SET estatus = %s WHERE folio = %s",
                      (derivar_estatus(total_items, aceptadas), cotizacion.folio))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
    conn.close()
    return {"message": "Cotización guardada exitosamente", "folio": cotizacion.folio}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
