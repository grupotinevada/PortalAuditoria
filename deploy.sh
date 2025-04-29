#!/bin/bash

# CONFIGURA TU REPO
REPO_URL="https://github.com/grupotinevada/PortalAuditoria.git"
CLONE_DIR="PortalAuditoria"
DEPLOY_PATH="/var/www"
TARGET_FOLDER="angular-standlone-sample"
SCREEN_NAME="NodePortalAuditoria"

# 1. Clonar el repositorio
echo "Clonando repositorio..."
git clone "$REPO_URL"

# 2. Entrar a la carpeta del proyecto
cd "$CLONE_DIR" || { echo "Error al entrar a $CLONE_DIR"; exit 1; }

# 3. Instalar dependencias
echo "Instalando dependencias con npm..."
npm install

# 4. Compilar Angular
echo "Compilando proyecto Angular..."
npx ng build --configuration=production

# 5. Eliminar antigua carpeta del servidor
echo "Eliminando carpeta antigua en $DEPLOY_PATH/$TARGET_FOLDER..."
sudo rm -rf "$DEPLOY_PATH/$TARGET_FOLDER"

# 6. Copiar build al servidor
echo "Copiando nueva build al servidor..."
sudo cp -r "dist/$TARGET_FOLDER" "$DEPLOY_PATH/"

# 7. Entrar a backend
cd backend || { echo "Error al entrar a carpeta backend"; exit 1; }

# 8. Crear screen para backend node
echo "Iniciando backend en screen '$SCREEN_NAME'..."
screen -dmS "$SCREEN_NAME" bash -c 'npm install && node index.js'

# 9. Esperar unos segundos para que inicie node
sleep 5
screen -S "$SCREEN_NAME" -X stuff "^A^D"  # detach automáticamente si deseas

# 10. Mensaje final
echo ""
echo "✅ Portal auditoria se desplegó satisfactoriamente."
read -n1 -r -p "Presiona cualquier tecla para salir..."
echo ""
