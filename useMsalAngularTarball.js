/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ruta base para el proyecto
const angularSamplePath = process.cwd();

// Ruta de MSAL Angular (deberás ajustar esta ruta según tu proyecto)
const msalAngularPath = path.resolve(__dirname, 'node_modules', '@azure', 'msal-angular');

// Verificar si la ruta existe antes de intentar ejecutar los comandos
if (!fs.existsSync(msalAngularPath)) {
    console.error('No se encuentra la librería MSAL Angular en la ruta esperada.');
    process.exit(1);
}

// Ruta del directorio dist de MSAL Angular
const msalAngularDistPath = path.join(msalAngularPath, 'dist');

// Verificar si el directorio dist existe
if (!fs.existsSync(msalAngularDistPath)) {
    console.log('No se encontró el directorio dist de MSAL Angular. Solo se procederá con la instalación.');
}

// Leer package.json de MSAL Angular para obtener la versión
const packageJsonPath = path.join(msalAngularPath, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Crear el nombre del archivo .tgz usando la versión de MSAL Angular
const tgzFilename = `azure-msal-angular-${packageJson.version}.tgz`;

// Instalar el archivo .tgz en el proyecto Angular
try {
    console.log('Instalando MSAL Angular en el proyecto...');
    execSync(`npm i ${path.join(msalAngularDistPath, tgzFilename)}`, { cwd: angularSamplePath, stdio: 'inherit' });
    console.log('MSAL Angular instalado correctamente.');
} catch (error) {
    console.error('Error durante la instalación de MSAL Angular:', error.message);
    process.exit(1);
}
