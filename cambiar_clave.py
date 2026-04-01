import sqlite3
import os
from passlib.context import CryptContext
# Configuración de seguridad (igual a la de tu backend)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "cotizaciones.db")
def cambiar_password():
    nueva_clave = input("Introduce tu NUEVA contraseña: ")
    if not nueva_clave:
        print("La contraseña no puede estar vacía.")
        return
    # Encriptar la nueva clave
    hashed_pw = pwd_context.hash(nueva_clave)
    # Actualizar la base de datos
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE usuarios SET password = ? WHERE username = 'admin'", (hashed_pw,))
    
    if c.rowcount > 0:
        conn.commit()
        print("\n¡Éxito! La contraseña del usuario 'admin' ha sido actualizada.")
    else:
        print("\nError: No se encontró al usuario 'admin'.")
    
    conn.close()
if __name__ == "__main__":
    cambiar_password()
