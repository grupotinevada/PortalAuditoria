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
    database: process.env.DB_NAME || 'portalauditoria',
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
    const { UsuarioID, NombreUsuario, CorreoElectronico, idPerfil } = req.body;

    if (!UsuarioID || !NombreUsuario || !CorreoElectronico || !idPerfil) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    console.log('solicitud aceptada')
    try {
        // Verificar si el usuario ya existe por su correo
        const sqlCheck = `SELECT UsuarioID FROM usuarios WHERE CorreoElectronico = ?`;
        db.query(sqlCheck, [CorreoElectronico], async (err, results) => {
            if (err) {
                console.error('Error al verificar usuario:', err);
                return res.status(500).json({ error: 'Error al verificar usuario' });
            }

            if (results.length > 0) {
                const hashedStoredToken = results[0].UsuarioID;

                // Comparar el idToken recibido con el almacenado
                const isMatch = await bcrypt.compare(UsuarioID, hashedStoredToken);
                console.log('comparando token')
                if (isMatch) {
                    console.log('Usuario ya registrado con el mismo idToken, no se realizan cambios')
                    return res.json({ message: 'Usuario ya registrado con el mismo idToken, no se realizan cambios' });
                    
                } else {
                    // Encriptar el nuevo idToken y actualizarlo
                    const hashedNewToken = await bcrypt.hash(UsuarioID, 10);
                    console.log('token desactualizado, hasheando token nuevo')
                    const sqlUpdate = `UPDATE usuarios SET UsuarioID = ? WHERE CorreoElectronico = ?`;
                    db.query(sqlUpdate, [hashedNewToken, CorreoElectronico], (err, result) => {
                        if (err) {
                            console.error('Error al actualizar usuario:', err);
                            return res.status(500).json({ error: 'Error al actualizar usuario' });
                        }
                        console.log('token actualizado')
                        return res.json({ message: 'idToken actualizado correctamente' });
                    });
                }
            } else {
                // Encriptar idToken antes de guardarlo

                const hashedToken = await bcrypt.hash(UsuarioID, 10);
                const sqlInsert = `
                    INSERT INTO usuarios (UsuarioID, NombreUsuario, CorreoElectronico, idPerfil)
                    VALUES (?, ?, ?, ?)
                `;
                console.log('token hasheado 1ra vez')
                db.query(sqlInsert, [hashedToken, NombreUsuario, CorreoElectronico, idPerfil], (err, result) => {
                    if (err) {
                        console.error('Error al insertar usuario:', err);
                        return res.status(500).json({ error: 'Error al guardar usuario' });
                    }
                    console.log('Usuario guardado con exito')
                    res.json({ message: 'Usuario guardado con éxito' });
                });
            }
        });

    } catch (error) {
        console.error('Error en el proceso:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});



// Obtener usuario con su perfil
app.get('/usuario/:UsuarioID/:CorreoElectronico/perfil', (req, res) => {
    const { CorreoElectronico, UsuarioID } = req.params; // Desestructurar para obtener ambos valores
    // Verificar que se reciba el CorreoElectronico y el UsuarioID
    console.log('Correo recibido:', CorreoElectronico);
    console.log('UsuarioID recibido:', UsuarioID);

    // Primero, buscar el UsuarioID almacenado en la base de datos para ese CorreoElectronico
    const sqlCheck = `SELECT UsuarioID FROM usuarios WHERE CorreoElectronico = ?`;

    db.query(sqlCheck, [CorreoElectronico], async (err, results) => {
        if (err) {
            console.error('Error al verificar usuario:', err);
            return res.status(500).json({ error: 'Error al verificar usuario' });
        }

        // Verificar si se encontró el usuario con ese correo
        if (results.length === 0) {
            console.log('No se encontró el usuario con el correo:', CorreoElectronico);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener el UsuarioID almacenado (hash)
        const storedUsuarioID = results[0].UsuarioID;

        // Comparar el UsuarioID recibido con el almacenado en la base de datos
        const isMatch = await bcrypt.compare(UsuarioID, storedUsuarioID);
        console.log('Comparando el ID del usuario con el hash almacenado');

        if (isMatch) {
            // Si los IDs coinciden, obtener los detalles del usuario
            const sql = `
                SELECT u.UsuarioID, u.NombreUsuario, u.CorreoElectronico, p.idPerfil, p.desc AS descPerfil
                FROM usuarios u
                JOIN perfil p ON u.idPerfil = p.idPerfil
                WHERE u.CorreoElectronico = ?
            `;

            db.query(sql, [CorreoElectronico], (err, results) => {
                if (err) {
                    console.error('Error al obtener usuario:', err);
                    return res.status(500).json({ error: 'Error al obtener usuario' });
                }


                res.json(results[0] || {}); // Devolver el primer resultado si existe
            });
        } else {
            // Si los IDs no coinciden, enviar un error controlado
            console.log('Los ID no coinciden para el correo:', CorreoElectronico);
            return res.status(401).json({ error: 'Los IDs no coinciden. No se puede proceder con la solicitud.' });
        }
    });
});


app.get('/pais', (req, res) => {
    const sql = `
        SELECT *
        FROM paises
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener países:', err);
            return res.status(500).json({ error: 'Error al obtener países' });
        }
        res.json(results || []);
    });
});

app.get('/sociedades', (req, res) => {
    const sql = `
        SELECT s.*, p.ProyectoID
        FROM sociedades s
        JOIN proyectos p ON p.SociedadID = s.SociedadID
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener sociedades:', err);
            return res.status(500).json({ error: 'Error al obtener sociedades' });
        }
        res.json(results || []);
    });
});

//proyecto endpoint
app.get('/proyectos/:PaisID', (req, res) => {
    const { PaisID } = req.params;

    const sql = `
SELECT 
    p.ProyectoID, 
    p.NombreProyecto, 
    p.FechaInicio, 
    p.FechaFin, 
    p.habilitado, 
    e.descEstado AS descEstado,  
    pa.PaisID, 
    pa.NombrePais, 
    pa.cod, 
    auditor.NombreUsuario AS AuditorNombre,
    auditor.IdPerfil AS AuditorIdPerfil,
    auditor.CorreoElectronico AS AuditorCorreo,
    revisor.NombreUsuario AS RevisorNombre,
    revisor.IdPerfil AS RevisorIdPerfil,
    revisor.CorreoElectronico AS RevisorCorreo
FROM 
    proyectos p
JOIN 
    sociedades s ON p.SociedadID = s.SociedadID
JOIN 
    paises pa ON s.PaisID = pa.PaisID
JOIN 
    estados e ON p.idEstado = e.idEstado
JOIN 
    usuarios auditor ON auditor.UsuarioID = p.AuditorID
LEFT JOIN 
    usuarios revisor ON revisor.UsuarioID = p.RevisorID
WHERE 
    pa.PaisID = ?;
    `;

    db.query(sql, [PaisID], (err, results) => {
        if (err) {
            console.error('Error al obtener proyectos:', err);
            return res.status(500).json({ error: 'Error al obtener proyectos' });
        }
        console.log('datos enviados al front')
        res.json(results || []);
    });
});

app.post('/proyectos', (req, res) => {
    const { SociedadID, NombreProyecto, FechaInicio, FechaFin, idEstado, AuditorID, RevisorID, habilitado } = req.body;

    // Validar que los campos obligatorios estén presentes
    if (!SociedadID || !NombreProyecto || !idEstado) {
        return res.status(400).json({ error: 'SociedadID, NombreProyecto y idEstado son obligatorios' });
    }

    const sql = `
        INSERT INTO proyectos (SociedadID, NombreProyecto, FechaInicio, FechaFin, idEstado, AuditorID, RevisorID, habilitado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [SociedadID, NombreProyecto, FechaInicio, FechaFin, idEstado, AuditorID, RevisorID, habilitado];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error al crear proyecto:', err);
            return res.status(500).json({ error: 'Error al crear el proyecto' });
        }
        res.json({ message: 'Proyecto creado con éxito', ProyectoID: result.insertId });
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});



