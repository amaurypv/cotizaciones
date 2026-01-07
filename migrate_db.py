import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "cotizaciones.db")

def migrate():
    if not os.path.exists(DB_NAME):
        print("Database does not exist, init_db will handle it.")
        return

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Check if columns exist in catalogo_productos
    c.execute("PRAGMA table_info(catalogo_productos)")
    columns = [row[1] for row in c.fetchall()]
    
    if "proveedor" not in columns:
        print("Adding 'proveedor' column to 'catalogo_productos'")
        c.execute("ALTER TABLE catalogo_productos ADD COLUMN proveedor TEXT")
    
    if "costo" not in columns:
        print("Adding 'costo' column to 'catalogo_productos'")
        c.execute("ALTER TABLE catalogo_productos ADD COLUMN costo REAL DEFAULT 0.0")
    
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
