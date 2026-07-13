# Despliegue del Panel Meteorológico en Vercel

Esta guía detalla los pasos para desplegar la aplicación en [Vercel](https://vercel.com).

## ⚠️ Advertencia sobre la Base de Datos (SQLite)
Por defecto, este proyecto utiliza **SQLite** (`dev.db`), el cual almacena los datos en un archivo local. 
En Vercel (servidores serverless), el sistema de archivos es efímero y de solo lectura en producción. Esto significa que **cualquier dato guardado en SQLite local se borrará cada vez que la función se reinicie**.

Para producción en Vercel, se recomienda conectar una base de datos externa compatible con Prisma (como PostgreSQL en **Supabase**, **Neon**, o **Vercel Postgres**). Si prefieres seguir usando una base de datos SQLite distribuida, puedes usar **Turso**.

---

## Paso 1: Configurar un repositorio en GitHub
1. Inicializa un repositorio git si aún no lo has hecho:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Crea un nuevo repositorio en GitHub y sube tu código:
   ```bash
   git remote add origin <URL_DE_TU_REPOSITORIO>
   git branch -M main
   git push -u origin main
   ```

---

## Paso 2: Crear una Base de Datos en la Nube (Opcional pero Recomendado)
Si deseas persistir las lecturas del ESP32 en producción:
1. Crea un proyecto en [Supabase](https://supabase.com/) o [Neon](https://neon.tech/).
2. Copia la **ConnectionString / Connection URI** proporcionada (debe iniciar con `postgres://` o `postgresql://`).
3. (Opcional) Si decides usar PostgreSQL, deberás actualizar la sección `datasource` en tu archivo `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

---

## Paso 3: Configurar el Proyecto en Vercel
1. Ve a [Vercel](https://vercel.com/) e inicia sesión.
2. Haz clic en **Add New...** > **Project**.
3. Importa el repositorio de GitHub que acabas de subir.
4. En la sección **Environment Variables** (Variables de Entorno), añade las siguientes variables:
   * **`DATABASE_URL`**: 
     * *Si usas base de datos externa*: Pega la URL de Supabase/Neon.
     * *Si usas SQLite local solo para pruebas*: Pega `file:./dev.db` (nota: no guardará datos persistentemente).
   * **`NEXT_PUBLIC_APP_URL`**: La URL de tu sitio en Vercel (ej. `https://mi-proyecto.vercel.app`).
5. Haz clic en **Deploy**.

---

## Paso 4: Ejecutar Migraciones de Base de Datos en Vercel
Para que las tablas se creen en tu base de datos externa durante el despliegue de Vercel, debes modificar tu script de construcción en `package.json` para que ejecute las migraciones automáticamente.

En tu `package.json`, puedes cambiar el script `build` de:
```json
"build": "next build"
```
a:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

Esto asegura que Prisma genere el cliente y ejecute todas las migraciones pendientes en tu base de datos de producción antes de compilar Next.js.
