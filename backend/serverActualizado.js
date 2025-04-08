require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
const logger = require('./logger');

const app = express();
app.use(cors());
app.use(express.json());

// Crear pool de conexiones en lugar de una única conexión
const db = mysql.createPool({
    host: process.env.DB_HOST || '192.168.195.147',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'NEVada--3621',
    database: process.env.DB_NAME || 'panelAuditoria',
    waitForConnections: true,
    connectionLimit: 10, // Número máximo de conexiones simultáneas
    queueLimit: 0
});
 
// Verificar la conexión
db.getConnection((err, connection) => {
    if (err) {
        logger.error('[ERROR] Fallo en la conexión a MySQL:', err);
        return;
    }
    logger.info('[SUCCESS] Conectado a MySQL con Pool de conexiones');
    connection.release(); // Liberar la conexión después de la prueba
});
 
// Guardar o actualizar usuario autenticado
app.post('/usuarios', async (req, res) => {
    const { idusuario, nombreUsuario, correo, idrol, habilitado } = req.body;

    if (!idusuario || !nombreUsuario || !correo || !idrol || !habilitado) {
        logger.warn('[WARN] Datos incompletos en la solicitud', { body: req.body });
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        logger.info(`[INFO] Verificando si el usuario con correo ${correo} existe...`);

        // Verificar si el usuario ya existe por correo
        const sqlCheck = `SELECT idusuario FROM usuario WHERE correo = ?`;
        const [results] = await db.promise().query(sqlCheck, [correo]);

        if (results.length > 0) {
            const storedIdUsuario = results[0].idusuario;
            logger.info(`[INFO] Usuario encontrado con idusuario: ${storedIdUsuario}`);

            if (storedIdUsuario === idusuario) {
                logger.info('[INFO] Usuario ya registrado con el mismo idusuario. No se realizan cambios.');
                return res.json({ message: 'Usuario ya registrado con el mismo idusuario, no se realizan cambios' });
            }

            // Si el token ID (idusuario) ha cambiado, actualizarlo
            logger.info(`[INFO] idusuario ha cambiado (antes: ${storedIdUsuario}, ahora: ${idusuario}). Actualizando...`);
            const sqlUpdate = `UPDATE usuario SET idusuario = ? WHERE correo = ?`;
            await db.promise().query(sqlUpdate, [idusuario, correo]);

            logger.info('[SUCCESS] idusuario actualizado correctamente.');
            return res.json({ message: 'idusuario actualizado correctamente' });
        }

        // Si el usuario no existe, insertarlo con habilitado = 1
        logger.info('[INFO] Usuario no encontrado. Insertando nuevo usuario...');
        const sqlInsert = `INSERT INTO usuario (idusuario, nombreUsuario, correo, idrol, habilitado) VALUES (?, ?, ?, ?, ?)`;
        await db.promise().query(sqlInsert, [idusuario, nombreUsuario, correo, idrol, habilitado]);

        logger.info('[SUCCESS] Usuario guardado con éxito.');
        res.json({ message: 'Usuario guardado con éxito' });
    } catch (error) {
        logger.error('[ERROR] Error en el proceso', { error });
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
 
// Obtener sociedades por país
app.get('/sociedades/por-pais/:idPais', async (req, res) => {
    const idPais = req.params.idPais;
    console.log(`[INFO] Petición recibida para obtener sociedades del país ID: ${idPais}`);

    try {
        const sql = `SELECT idsociedad, nombresociedad, habilitado FROM sociedad WHERE idpais = ?`;

        const [results] = await db.promise().query(sql, [idPais]);

        if (results.length === 0) {
            console.warn(`[WARN] No se encontraron sociedades para el país ID: ${idPais}`);
            return res.status(404).json({ error: 'No se encontraron sociedades para este país' });
        }

        console.log(`[SUCCESS] ${results.length} sociedades obtenidas para el país ID: ${idPais}`);
        res.json(results);

    } catch (error) {
        console.error('[ERROR] Error al obtener sociedades:', error);
        res.status(500).json({ error: 'Error en el servidor al obtener sociedades' });
    }
});
 
// Obtener sociedades
app.get('/sociedades/por-proyecto/:idproyecto', async (req, res) => {
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

// Obtener todas las sociedades
app.get('/sociedades', async (req, res) => {
    const sql = `
        SELECT idsociedad, nombresociedad
        FROM panelAuditoria.sociedad
        WHERE habilitado = 1;
    `;

    try {
        const [results] = await db.promise().query(sql);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener todas las sociedades', details: err.message });
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

app.post('/proyecto', async (req, res) => {
    console.log('[INFO] Petición recibida para crear un nuevo proyecto.');
    
    const { idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado, sociedadesSeleccionadas } = req.body;
    console.log('[DEBUG] Datos recibidos:', { idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado, sociedadesSeleccionadas });

    if (!nombreproyecto || !fecha_inicio || !fecha_termino || habilitado == null) {
        console.warn('[WARN] Datos insuficientes para crear un proyecto.');
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    if (!Array.isArray(sociedadesSeleccionadas) || sociedadesSeleccionadas.length === 0) {
        console.warn('[WARN] No se han proporcionado sociedades seleccionadas.');
        return res.status(400).json({ error: 'Debe seleccionar al menos una sociedad para vincular al proyecto.' });
    }

    let idproyecto;

    try {
        // Insertar el nuevo proyecto
        const sqlProyecto = `
            INSERT INTO proyecto (idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const valuesProyecto = [idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado];

        console.log('[DEBUG] Ejecutando inserción en tabla "proyecto"');
        const [result] = await db.promise().query(sqlProyecto, valuesProyecto);
        idproyecto = result.insertId;
        console.log(`[SUCCESS] Proyecto creado con ID: ${idproyecto}`);

        // Insertar relaciones en proyecto_sociedad
        const insertRelacion = `INSERT INTO proyecto_sociedad (idproyecto, idsociedad) VALUES ?`;
        const valuesRelacion = sociedadesSeleccionadas.map(idsoc => [idproyecto, idsoc]);

        await db.promise().query(insertRelacion, [valuesRelacion]);

        console.log('[SUCCESS] Todas las relaciones proyecto-sociedad insertadas correctamente.');

        res.status(201).json({
            idproyecto,
            message: 'Proyecto creado y vinculado exitosamente con las sociedades seleccionadas'
        });

    } catch (error) {
        console.error('[ERROR] Error al procesar la solicitud:', error.sqlMessage || error.message);

        // Rollback si se creó el proyecto pero falló la vinculación
        if (idproyecto) {
            try {
                console.log('[INFO] Revirtiendo proyecto creado previamente...');
                await db.promise().query('DELETE FROM proyecto WHERE idproyecto = ?', [idproyecto]);
                console.log('[SUCCESS] Proyecto eliminado debido a fallo en vinculación.');
            } catch (rollbackError) {
                console.error('[FATAL] Error al eliminar el proyecto tras fallo en la relación:', rollbackError.sqlMessage || rollbackError.message);
            }
        }

        res.status(500).json({ error: 'Error al crear el proyecto o vincularlo con las sociedades seleccionadas' });
    }
});




// Obtener procesos para una sociedad por idSociedad e idproyecto
app.get('/procesos/:idSociedad/:idProyecto?', async (req, res) => {
    const { idSociedad, idProyecto } = req.params;

    console.debug(`[DEBUG] Petición recibida: /procesos/${idSociedad}${idProyecto ? `/${idProyecto}` : ''}`);

    let sql = `
        SELECT 
            p.idproceso,
            p.idproyecto,
            p.idsociedad,
            p.nombreproceso,
            p.fecha_inicio,
            p.fecha_fin,
            p.responsable,
            p.revisor,
            p.idestado,
            s.nombresociedad,
            e.descestado,
            r1.nombreusuario AS responsable_nombre,
            r2.nombreusuario AS revisor_nombre
        FROM panelAuditoria.proceso p
        JOIN panelAuditoria.proyecto_sociedad ps 
            ON p.idsociedad = ps.idsociedad AND p.idproyecto = ps.idproyecto
        LEFT JOIN panelAuditoria.sociedad s ON p.idsociedad = s.idsociedad
        LEFT JOIN panelAuditoria.estado e ON p.idestado = e.idestado
        LEFT JOIN panelAuditoria.usuario r1 ON p.responsable = r1.idusuario
        LEFT JOIN panelAuditoria.usuario r2 ON p.revisor = r2.idusuario
        WHERE p.idsociedad = ?
    `;

    const params = [idSociedad];

    if (idProyecto) {
        sql += ' AND p.idproyecto = ?';
        params.push(idProyecto);
    }

    try {
        console.debug(`[DEBUG] Ejecutando consulta SQL con params: ${params}`);

        const [results] = await db.promise().query(sql, params);

        if (results.length === 0) {
            console.warn(`[WARN] No se encontraron procesos para la sociedad ${idSociedad}${idProyecto ? ` y proyecto ${idProyecto}` : ''}`);
            return res.status(404).json({ error: 'No se encontraron procesos para los parámetros especificados' });
        }

        console.info(`[INFO] Consulta exitosa. Procesos encontrados: ${results.length}`);
        console.debug(`[SUCCESS] Datos enviados al frontend:`, results);

        res.json(results);
    } catch (err) {
        console.error(`[ERROR] Error al obtener procesos`, err);
        res.status(500).json({ error: 'Error al obtener procesos', details: err.message });
    }
});



// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[SUCCESS] Servidor corriendo en http://localhost:${PORT}`);
});