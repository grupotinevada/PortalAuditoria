require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
 
const app = express();
app.use(cors());
app.use(express.json());
 
// Configurar conexión a MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || '192.168.195.147',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ||'NEVada--3621',
    database: process.env.DB_NAME || 'panelAuditoria',
    // ssl: { ca: fs.readFileSync('./DigiCertGlobalRootCA.crt.pem') }
});
 
db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL');
});
 
// Guardar o actualizar usuario autenticado
app.post('/usuarios', async (req, res) => {
    const { idusuario, nombreUsuario, correo, idrol, habilitado } = req.body;
 
    if (!idusuario || !nombreUsuario || !correo || !idrol || !habilitado) {
        console.warn('[WARN] Datos incompletos en la solicitud:', req.body);
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
 
    try {
        console.log(`[INFO] Verificando si el usuario con correo ${correo} existe...`);
       
        // Verificar si el usuario ya existe por correo
        const sqlCheck = `SELECT idusuario FROM usuario WHERE correo = ?`;
        const [results] = await db.promise().query(sqlCheck, [correo]);
 
        if (results.length > 0) {
            const storedIdUsuario = results[0].idusuario;
            console.log(`[INFO] Usuario encontrado con idusuario: ${storedIdUsuario}`);
 
            if (storedIdUsuario === idusuario) {
                console.log('[INFO] El usuario ya está registrado con el mismo idusuario. No se realizan cambios.');
                return res.json({ message: 'Usuario ya registrado con el mismo idusuario, no se realizan cambios' });
            }
 
            // Si el token ID (idusuario) ha cambiado, actualizarlo
            console.log(`[INFO] El idusuario ha cambiado (antes: ${storedIdUsuario}, ahora: ${idusuario}). Actualizando...`);
            const sqlUpdate = `UPDATE usuario SET idusuario = ? WHERE correo = ?`;
            await db.promise().query(sqlUpdate, [idusuario, correo]);
 
            console.log('[SUCCESS] idusuario actualizado correctamente.');
            return res.json({ message: 'idusuario actualizado correctamente' });
        }
 
        // Si el usuario no existe, insertarlo con habilitado = 1
        console.log('[INFO] El usuario no existe. Insertando nuevo usuario...');
        const sqlInsert = `INSERT INTO usuario (idusuario, nombreUsuario, correo, idrol, habilitado) VALUES (?, ?, ?, ?, ?)`;
        await db.promise().query(sqlInsert, [idusuario, nombreUsuario, correo, idrol, habilitado]);
 
        console.log('[SUCCESS] Usuario guardado con éxito.');
        res.json({ message: 'Usuario guardado con éxito' });
    } catch (error) {
        console.error('[ERROR] Error en el proceso:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});
 
 
 
 
// Obtener usuario con su perfil
app.get('/usuario/:idusuario/:correo/perfil', async (req, res) => {
    const { correo, idusuario } = req.params; // Desestructurar para obtener ambos valores
 
    console.log(`[INFO] Petición recibida para obtener perfil: Correo: ${correo}, idusuario: ${idusuario}`);
 
    try {
        // Buscar el idusuario almacenado en la base de datos para el correo
        console.log('[INFO] Verificando idusuario almacenado en la base de datos...');
        const sqlCheck = `SELECT idusuario FROM usuario WHERE correo = ?`;
        const [results] = await db.promise().query(sqlCheck, [correo]);
 
        if (results.length === 0) {
            console.warn(`[WARN] Usuario con correo ${correo} no encontrado.`);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
 
        const storedIdusuario = results[0].idusuario;
        console.log(`[INFO] idusuario almacenado: ${storedIdusuario}`);
 
        // Comparar idusuario recibido con el almacenado
        if (idusuario !== storedIdusuario) {
            console.warn(`[WARN] Los idusuarios no coinciden (Recibido: ${idusuario}, Almacenado: ${storedIdusuario})`);
            return res.status(401).json({ error: 'Los idusuarios no coinciden. No se puede proceder con la solicitud.' });
        }
 
        // Obtener detalles del usuario si los idusuarios coinciden
        console.log('[INFO] idusuario coincide. Obteniendo detalles del perfil...');
        const sql = `
            SELECT u.idusuario, u.nombreUsuario, u.correo, r.idrol, r.descrol
            FROM usuario u
            JOIN rol r ON u.idrol = r.idrol
            WHERE u.correo = ?
        `;
 
        const [userResults] = await db.promise().query(sql, [correo]);
 
        if (userResults.length === 0) {
            console.warn(`[WARN] No se encontraron detalles del usuario para el correo: ${correo}`);
            return res.status(404).json({ error: 'No se encontraron detalles del usuario' });
        }
 
        console.log('[SUCCESS] Perfil obtenido con éxito.');
        res.json(userResults[0]); // Devolver el primer resultado si existe
 
    } catch (error) {
        console.error('[ERROR] Error al obtener el perfil del usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});
 
 
// Obtener países
app.get('/pais', async (req, res) => {
    console.log('[INFO] Petición recibida para obtener países.');
 
    try {
        const sql = `SELECT * FROM pais`;
        const [results] = await db.promise().query(sql);
 
        if (results.length === 0) {
            console.warn('[WARN] No se encontraron países en la base de datos.');
            return res.status(404).json({ error: 'No se encontraron países' });
        }
 
        console.log(`[SUCCESS] ${results.length} países obtenidos.`);
        res.json(results);
 
    } catch (error) {
        console.error('[ERROR] Error al obtener países:', error);
        res.status(500).json({ error: 'Error en el servidor al obtener países' });
    }
});
 
 
// Obtener sociedades
app.get('/sociedades/:idproyecto', async (req, res) => {
    const { idproyecto } = req.params;
 
    console.debug(`[DEBUG] Petición recibida: /sociedades/${idproyecto}`);
 
    const sql = `
        SELECT
            s.idsociedad,
            s.nombresociedad
        FROM panelAuditoria.sociedad s
        JOIN panelAuditoria.proyecto_sociedad ps ON s.idsociedad = ps.idsociedad
        WHERE ps.idproyecto = ?;
    `;
 
    try {
        console.debug(`[DEBUG] Ejecutando consulta SQL con idproyecto: ${idproyecto}`);
 
        const [results] = await db.promise().query(sql, [idproyecto]);
 
        if (results.length === 0) {
            console.warn(`[WARN] No se encontraron sociedades para el idproyecto: ${idproyecto}`);
            return res.status(404).json({ error: 'No se encontraron sociedades para el proyecto especificado' });
        }
 
        console.info(`[INFO] Consulta exitosa. Sociedades encontradas: ${results.length}`);
        console.debug(`[SUCCESS] Datos enviados al frontend:`, results);
 
        res.json(results);
    } catch (err) {
        console.error(`[ERROR] Error al obtener sociedades para idproyecto: ${idproyecto}`, err);
        res.status(500).json({ error: 'Error al obtener sociedades', details: err.message });
    }
});
 
 
 
//proyecto endpoint
// Obtener proyectos por país con depuración detallada
app.get('/proyectos/:PaisID', async (req, res) => {
    const { PaisID } = req.params;
 
    console.debug(`[DEBUG] Petición recibida: /proyectos/${PaisID}`);
 
    const sql = `
        SELECT
            p2.idpais,
            p2.nombrepais,
            p2.cod,
            u.nombreUsuario,
            u.correo,
            p.idproyecto,
            p.fecha_inicio,
            p.fecha_termino,
            p.habilitado,
            p.nombreproyecto
        FROM panelAuditoria.proyecto p    
        JOIN panelAuditoria.pais p2 ON p.idpais = p2.idpais  
        JOIN panelAuditoria.usuario u ON p.idusuario = u.idusuario  
        WHERE p.idpais = ?;
    `;
 
    try {
        console.debug(`[DEBUG] Ejecutando consulta SQL con PaisID: ${PaisID}`);
 
        const [results] = await db.promise().query(sql, [PaisID]);
 
        if (results.length === 0) {
            console.warn(`[WARN] No se encontraron proyectos para el PaisID: ${PaisID}`);
            return res.status(404).json({ error: 'No se encontraron proyectos para el país especificado' });
        }
 
        console.info(`[INFO] Consulta exitosa. Proyectos encontrados: ${results.length}`);
        console.debug(`[SUCCESS] Datos enviados al frontend:`, results);
 
        res.json(results);
    } catch (err) {
        console.error(`[ERROR] Error al obtener proyectos para PaisID: ${PaisID}`, err);
        res.status(500).json({ error: 'Error al obtener proyectos', details: err.message });
    }
});
 
 
 
 
// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});