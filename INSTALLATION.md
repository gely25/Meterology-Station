# Guía de Instalación

Este documento proporciona instrucciones paso a paso para configurar y ejecutar el Dashboard de la Estación Meteorológica en su entorno de desarrollo local.

## Prerrequisitos

Antes de comenzar, asegúrese de tener instalado lo siguiente en su sistema:

1. Node.js (Se recomienda la versión 18.x o superior)
2. Un gestor de paquetes. El proyecto utiliza \`pnpm\` por defecto, pero también puede utilizar \`npm\` o \`yarn\`.

## Pasos de Instalación

1. Navegar al Directorio del Proyecto
Abra su terminal y navegue hasta el directorio raíz del proyecto.

2. Instalar Dependencias
Ejecute el siguiente comando para instalar todos los paquetes y dependencias requeridas definidas en \`package.json\`:

\`\`\`bash
pnpm install
\`\`\`
*(Si está utilizando npm, ejecute \`npm install\`)*

3. Iniciar el Servidor de Desarrollo
Una vez instaladas las dependencias, inicie el servidor de desarrollo local:

\`\`\`bash
pnpm run dev
\`\`\`
*(Si está utilizando npm, ejecute \`npm run dev\`)*

4. Acceder a la Aplicación
Abra su navegador web y diríjase a la siguiente URL para ver el panel de control:

\`\`\`
http://localhost:3000
\`\`\`

## Construcción para Producción

Para crear una versión optimizada de producción de la aplicación, ejecute:

\`\`\`bash
pnpm run build
\`\`\`

Una vez completado el proceso de compilación, puede iniciar el servidor de producción con:

\`\`\`bash
pnpm run start
\`\`\`

## Solución de Problemas (Troubleshooting)

- Conflictos de Puerto: Si el puerto 3000 ya está en uso, Next.js intentará automáticamente utilizar un puerto alternativo (por ejemplo, 3001). Revise la salida de la terminal para ver la URL exacta.
- Errores de Dependencias: Si encuentra errores durante la instalación, intente eliminar la carpeta \`node_modules\` y el archivo \`pnpm-lock.yaml\`, y vuelva a ejecutar el comando de instalación.
