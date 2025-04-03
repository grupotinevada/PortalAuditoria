const winston = require('winston');
const fs = require('fs');
const path = require('path');


// Ruta del directorio de logs
const logDirectory = path.join(__dirname, 'logs_server');

// Verificar si la carpeta de logs existe, si no, crearla
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
    console.log('[INFO] Carpeta "logs_server" creada');
}
console.log('[INFO] Carpeta "logs_server" ya existe');

// Configuración de winston
const currentDate = new Date().toISOString().split('T')[0]; // Obtiene la fecha actual en formato YYYY-MM-DD
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(logDirectory,`server-${currentDate}.log`) }) // Usa la fecha en el nombre del archivo
    ]
});

module.exports = logger;
