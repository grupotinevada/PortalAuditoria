require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
const logger = require('./logger');
const { randomBytes } = require('crypto');
const axios = require('axios');
const multer = require('multer');
const ExcelJS = require('exceljs');


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
 
//#####################################################################################################################################
//#####################################################################################################################################
//#########################################  FUNCIONES AUXILIARES PARA EL SHAREPOINT  #################################################
//#####################################################################################################################################
//#########################################  FUNCIONES AUXILIARES PARA EL SHAREPOINT  #################################################
//#####################################################################################################################################
//#####################################################################################################################################
  // Función auxiliar para eliminar un archivo en SharePoint
  async function eliminarArchivoSharePoint(accessToken, idProceso, nombreArchivo) {
    const nombreCarpeta = `proceso_${idProceso}`;
    const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID;
    const DRIVE_NAME = process.env.DRIVE_NAME;
  
    try {
      // 1. Obtener ID del drive
      const driveRes = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/drives`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
  
      const drive = driveRes.data.value.find(d => d.name === DRIVE_NAME);
      if (!drive) {
        console.warn(`[INFO] Drive '${DRIVE_NAME}' no encontrado. Continuando...`);
        return { exito: true };
      }
  
      const driveId = drive.id;
  
      // 2. Verificar si la carpeta existe
      let carpetaId;
      try {
        const carpetaRes = await axios.get(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/proceso_${idProceso}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        carpetaId = carpetaRes.data.id;
      } catch (err) {
        if (err.response?.status === 404) {
          console.warn(`[INFO] Carpeta '${nombreCarpeta}' no existe. Continuando...`);
          return { exito: true };
        } else {
          throw err;
        }
      }
  
      // 3. Verificar si el archivo existe dentro de la carpeta
      let archivoId;
      try {
        const archivoRes = await axios.get(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/proceso_${idProceso}/${nombreArchivo}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        archivoId = archivoRes.data.id;
      } catch (err) {
        if (err.response?.status === 404) {
          console.warn(`[INFO] Archivo '${nombreArchivo}' no existe en la carpeta '${nombreCarpeta}'. Continuando...`);
          return { exito: true };
        } else {
          throw err;
        }
      }
  
      // 4. Eliminar el archivo
      await axios.delete(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${archivoId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
  
      console.info(`[INFO] Archivo '${nombreArchivo}' eliminado correctamente de '${nombreCarpeta}'`);
      return { exito: true };
  
    } catch (error) {
      const mensajeError = error.response?.data || error.message;
      console.error(`[ERROR] al intentar eliminar archivo '${nombreArchivo}':`, mensajeError);
  
      return {
        exito: false,
        mensaje: 'Error al eliminar el archivo en SharePoint',
        error: mensajeError
      };
    }
  }
  
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################

// FUNCIONES PARA EL SHAREPOINT
async function subirArchivoASharepoint(accessToken, idproceso, archivo, overwrite = false) {
    const siteName = process.env.SITE_NAME;
    const driveName = process.env.DRIVE_NAME;
    const carpetaNombre = `proceso_${idproceso}`;
    const archivoNombre = archivo.originalname;
  
    try {
      // 1. Obtener siteId
      const siteResp = await axios.get(`https://graph.microsoft.com/v1.0/sites/root:/sites/${siteName}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const siteId = siteResp.data.id;
  
      // 2. Obtener driveId
      const driveResp = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const driveId = driveResp.data.value.find(d => d.name === driveName)?.id;
      if (!driveId) throw new Error("No se encontró el drive");
  
      // 3. Obtener o crear carpeta
      let folderId;
      const folderList = await axios.get(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children?$filter=name eq '${carpetaNombre}'`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const folder = folderList.data.value[0];
  
      if (folder) {
        folderId = folder.id;
      } else {
        const createFolderResp = await axios.post(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`,
          {
            name: carpetaNombre,
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail"
          },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        folderId = createFolderResp.data.id;
      }
  
      // 4. Verificar si el archivo ya existe
      const archivoCheck = await axios.get(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children?$filter=name eq '${archivoNombre}'`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const archivoYaExiste = archivoCheck.data.value.length > 0;
  
      if (archivoYaExiste && !overwrite) {
        throw new Error('El archivo ya existe en SharePoint');
      }
  
      // 5. Subir archivo (sobrescribe si existe)
      const uploadResp = await axios.put(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${carpetaNombre}/${archivoNombre}:/content`,
        archivo.buffer,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': archivo.mimetype
          }
        }
      );
  
      return {
        carpeta: carpetaNombre,
        rutaArchivo: uploadResp.data.webUrl,
        nombreArchivo: archivoNombre
      };
  
    } catch (err) {
      console.error('Error al subir archivo a SharePoint:', err.response?.data || err.message);
      throw new Error('Error al subir archivo a SharePoint');
    }
  }
  
  //#####################################################################################################################################
  //#####################################################################################################################################
  //#####################################################################################################################################
  
  async function crearCarpetaYArchivoEnBlancoSharepoint(accessToken, idproceso) {
    const siteName = process.env.SITE_NAME;
    const driveName = process.env.DRIVE_NAME;
    const carpetaNombre = `proceso_${idproceso}`;
    const nombreArchivo = `archivo_proceso_${idproceso}.xlsx`;
  
    try {
      // 1. Obtener siteId
      const siteResp = await axios.get(`https://graph.microsoft.com/v1.0/sites/root:/sites/${siteName}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const siteId = siteResp.data.id;
  
      // 2. Obtener driveId
      const driveResp = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const driveId = driveResp.data.value.find(d => d.name === driveName)?.id;
      if (!driveId) throw new Error("No se encontró el drive");
  
      // 3. Verificar si carpeta ya existe
      const folderCheck = await axios.get(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children?$filter=name eq '${carpetaNombre}'`,
         { headers: { Authorization: `Bearer ${accessToken}` } }
      );
  
      if (folderCheck.data.value.length > 0) throw new Error('La carpeta del proceso ya existe');
  
      // 4. Crear carpeta
      const folderResp = await axios.post(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`,
        {
          name: carpetaNombre,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail"
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const folderId = folderResp.data.id;
  
      // 5. Crear archivo Excel en memoria
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Datos');
      sheet.addRow(['ID', 'Nombre', 'Estado']); // ejemplo
      const buffer = await workbook.xlsx.writeBuffer();
  
      // 6. Subir archivo
      const uploadResp = await axios.put(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}:/${nombreArchivo}:/content`,
        buffer,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        }
      );
  
      return {
        carpeta: carpetaNombre,
        rutaArchivo: uploadResp.data.webUrl,
        nombreArchivo
      };
  
    } catch (err) {
      console.error('Error creando carpeta y archivo Excel en blanco:', err.response?.data || err.message);
      throw new Error('Error al crear carpeta y archivo en blanco en SharePoint');
    }
  }

//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################

async function eliminarCarpetaSharePoint(accessToken, idproceso) {
  const nombreCarpeta = `proceso_${idproceso}`;
  const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID;
  const DRIVE_NAME = process.env.DRIVE_NAME;
  try {
    // Paso 1: Obtener ID del drive por nombre
    const driveResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/drives`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const drive = driveResponse.data.value.find(d => d.name === DRIVE_NAME);

    if (!drive) {
      console.error(`[ERROR] No se encontró el drive con nombre: ${DRIVE_NAME}`);
      return { exito: false, mensaje: 'Drive no encontrado' };
    }

    const driveId = drive.id;

    // Paso 2: Obtener el ID del item (carpeta) a eliminar
    const carpetaResponse = await axios.get(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${nombreCarpeta}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const itemId = carpetaResponse.data.id;

    // Paso 3: Eliminar la carpeta por su ID
    await axios.delete(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.info(`[INFO] Carpeta SharePoint '${nombreCarpeta}' eliminada correctamente`);
    return { exito: true };

  } catch (error) {
    console.error(`[ERROR] al eliminar carpeta proceso_${idproceso}:`, error.response?.data || error.message);
    return { exito: false, mensaje: 'Error al eliminar la carpeta en SharePoint', error: error.message };
  }
}
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################

async function gestionarPermisoUsuarioEnSharePoint(accessToken, idproceso, emailResponsable) {
  const nombreCarpeta = `proceso_${idproceso}`;
  const DRIVE_NAME = process.env.DRIVE_NAME;
  const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID;

  try {
    // Paso 1: Obtener ID del drive por nombre
    const driveResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/drives`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });


    const drive = driveResponse.data.value.find(d => d.name === DRIVE_NAME);
    if (!drive) throw new Error(`No se encontró el drive con nombre ${DRIVE_NAME}`);
    console.log('PASO 1')
    const driveId = drive.id;

    // Paso 2: Buscar la carpeta directamente
    const carpetaResponse = await axios.get(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${nombreCarpeta}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('PASO 2')
    const carpetaId = carpetaResponse.data.id;

    // Paso 3: Obtener permisos actuales
    const permisosResponse = await axios.get(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${carpetaId}/permissions`, {
      headers: { Authorization: `Bearer ${accessToken}` }

    });
    console.log('PASO 3')

    const email = emailResponsable?.trim().toLowerCase();
    const permisoUsuario = permisosResponse.data.value.find(p =>
      p.grantedToV2?.user?.email?.toLowerCase() === email
    );

    // Paso 4A: Agregar permisos
    if (emailResponsable) {
      console.log('PASO 4')
      if (!permisoUsuario) {
        await axios.post(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${carpetaId}/invite`,
          {
            requireSignIn: true,
            sendInvitation: false,
            roles: ['write'],
            recipients: [{ email }]
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`[SharePoint] Permisos otorgados a ${email}`);
        return { agregado: true, eliminado: false };
      } else {
        console.log(`[SharePoint] ${email} ya tiene permisos.`);
        return { agregado: false, eliminado: false };
      }
    }

    // Paso 4B: Eliminar permisos si no hay responsable
    if (!emailResponsable && permisoUsuario) {
      await axios.delete(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${carpetaId}/permissions/${permisoUsuario.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      console.log(`[SharePoint] Permisos eliminados para ${permisoUsuario.grantedToV2.user.email}`);
      return { agregado: false, eliminado: true };
    }

    return { agregado: false, eliminado: false };

  } catch (error) {
    console.error('[ERROR SharePoint] Error al gestionar permisos:', error.response?.data || error.message);
    throw error;
  }
}




//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################


async function obtenerUsuarioDesdeToken(accessToken) {
  try {
    const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const { displayName, mail, userPrincipalName, id } = response.data;
    return {
      nombre: displayName,
      correo: mail || userPrincipalName,
      id,
    };
  } catch (error) {
    logger.error('[ERROR] No se pudo obtener la identidad del token', { error: error.response?.data || error.message });
    return null;
  }
}

//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################

async function quitarPermisosUsuarioDeTodasLasCarpetas(accessToken, emailUsuario) {
  const DRIVE_NAME = process.env.DRIVE_NAME;
  const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID;
  const email = emailUsuario?.trim().toLowerCase();

  try {
    // 1. Obtener el drive por nombre
    const drivesResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/drives`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const drive = drivesResponse.data.value.find(d => d.name === DRIVE_NAME);
    if (!drive) throw new Error(`No se encontró el drive con nombre ${DRIVE_NAME}`);
    const driveId = drive.id;

    console.log('[PASO 1] Drive obtenido:', driveId);

    // 2. Obtener todas las carpetas en el root del drive
    const carpetasResponse = await axios.get(`https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const carpetas = carpetasResponse.data.value.filter(item => item.folder);

    console.log(`[PASO 2] ${carpetas.length} carpetas encontradas.`);

    let eliminados = 0;

    for (const carpeta of carpetas) {
      const carpetaId = carpeta.id;

      // 3. Obtener los permisos de la carpeta
      const permisosResponse = await axios.get(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${carpetaId}/permissions`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const permisos = permisosResponse.data.value;
      const permisoUsuario = permisos.find(p =>
        p.grantedToV2?.user?.email?.toLowerCase() === email
      );

      // 4. Eliminar el permiso si existe
      if (permisoUsuario) {
        await axios.delete(
          `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${carpetaId}/permissions/${permisoUsuario.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        console.log(`[SharePoint] Permiso eliminado en carpeta '${carpeta.name}'`);
        eliminados++;
      }
    }

    console.log(`[FINALIZADO] [PASO 3] Se eliminaron permisos en ${eliminados} carpeta(s).`);
    return { eliminados };

  } catch (error) {
    console.error('[ERROR SharePoint] Al eliminar permisos en carpetas:', error.response?.data || error.message);
    throw error;
  }
}

//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################
//#####################################################################################################################################

// Guardar o actualizar usuario autenticado y asignar permiso en SharePoint
app.post('/usuarios', async (req, res) => {
  const { idusuario, nombreUsuario, correo, idrol, habilitado } = req.body;

  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  const admin = await obtenerUsuarioDesdeToken(accessToken);
  if (admin) {
    logger.info(`[ADMIN] ${admin.correo} está intentando crear o actualizar al usuario ${correo}`);
  }
  if (!idusuario || !nombreUsuario || !correo || !idrol || !habilitado ) {
    logger.warn('[WARN] Datos incompletos en la solicitud', { body: req.body });

    return res.status(400).json({ error: 'Todos los campos y el token de autorización son obligatorios' });
  }

  try {
    logger.info(`[INFO] Verificando si el usuario con correo ${correo} existe...`);

    const sqlCheck = `SELECT idusuario FROM usuario WHERE correo = ?`;
    const [results] = await db.promise().query(sqlCheck, [correo]);

    if (results.length > 0) {
      const storedIdUsuario = results[0].idusuario;
      logger.info(`[INFO] Usuario encontrado con idusuario: ${storedIdUsuario}`);

      if (storedIdUsuario === idusuario) {
        logger.info('[INFO] Usuario ya registrado con el mismo idusuario. No se realizan cambios.');
        return res.json({ message: 'Usuario ya registrado con el mismo idusuario, no se realizan cambios' });
      }

      logger.info(`[INFO] idusuario ha cambiado (antes: ${storedIdUsuario}, ahora: ${idusuario}). Actualizando...`);
      const sqlUpdate = `UPDATE usuario SET idusuario = ? WHERE correo = ?`;
      await db.promise().query(sqlUpdate, [idusuario, correo]);

      logger.info('[SUCCESS] idusuario actualizado correctamente.');
      return res.json({ message: 'idusuario actualizado correctamente' });
    }

    // Insertar nuevo usuario
    logger.info('[INFO] Usuario no encontrado. Insertando nuevo usuario...');
    const sqlInsert = `INSERT INTO usuario (idusuario, nombreUsuario, correo, idrol, habilitado) VALUES (?, ?, ?, ?, ?)`;
    await db.promise().query(sqlInsert, [idusuario, nombreUsuario, correo, idrol, habilitado]);

    // Otorgar permisos en SharePoint
    const usuarioNuevo = { idusuario, email: correo };

    try {
      const resultadoPermiso = await agregarUsuarioSharePoint(accessToken, usuarioNuevo, 'read');
      logger.info('[SUCCESS] Permiso otorgado en SharePoint', resultadoPermiso);
    } catch (errorPermiso) {
      logger.error('[ERROR] Error al asignar permisos en SharePoint', { error: errorPermiso.message });
      // No abortamos la operación general si falla esta parte
    }

    logger.info('[SUCCESS] Usuario guardado con éxito.');
    res.json({ message: 'Usuario guardado con éxito y permisos asignados en SharePoint' });

  } catch (error) {
    logger.error('[ERROR] Error en el proceso', { error });
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


 // Modificar rol y habilitado de un usuario, y quitar permisos si corresponde
app.put('/usuarios', async (req, res) => {
  const { correo, idrol, habilitado } = req.body;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  if (!correo || idrol == null || habilitado == null) {
    logger.warn('[WARN] Datos incompletos en la solicitud PUT /usuarios', { body: req.body });
    return res.status(400).json({ error: 'Correo, idrol y habilitado son obligatorios' });
  }

  try {
    logger.info(`[INFO] Verificando si existe el usuario con correo ${correo}...`);

    const [results] = await db.promise().query('SELECT * FROM usuario WHERE correo = ?', [correo]);

    if (results.length === 0) {
      logger.warn(`[WARN] Usuario con correo ${correo} no encontrado`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioExistente = results[0];

    // Evitar que se modifiquen campos no permitidos
    logger.info(`[INFO] Actualizando idrol y habilitado del usuario ${correo}`);
    await db.promise().query(
      'UPDATE usuario SET idrol = ?, habilitado = ? WHERE correo = ?',
      [idrol, habilitado, correo]
    );

    // Si habilitado === 0, quitar permisos de todas las carpetas
    if (habilitado === 0 || habilitado === '0') {
      try {
        logger.info(`[INFO] Usuario deshabilitado. Eliminando permisos en SharePoint para ${correo}...`);
        const resultado = await quitarPermisosUsuarioDeTodasLasCarpetas(accessToken, correo);
        logger.info('[SUCCESS] Permisos eliminados en SharePoint:', resultado);
      } catch (errorPermiso) {
        logger.error('[ERROR] No se pudieron eliminar los permisos del usuario en SharePoint', {
          error: errorPermiso.message
        });
        // Nota: no se aborta el proceso general si esto falla
      }
    }

    logger.info('[SUCCESS] Usuario actualizado correctamente');
    return res.json({ message: 'Usuario actualizado correctamente' });

  } catch (error) {
    logger.error('[ERROR] Error al actualizar usuario', { error: error.message });
    return res.status(500).json({ error: 'Error en el servidor' });
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
            SELECT u.idusuario, u.nombreUsuario, u.correo, u.habilitado, r.idrol, r.descrol
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

 // Obtener usuarios
 app.get('/estados', async (req, res) => {
    console.log('[INFO] Petición recibida para obtener estados.');
 
    try {
        const sql = `SELECT * FROM estado`;
        const [results] = await db.promise().query(sql);
 
        if (results.length === 0) {
            console.warn('[WARN] No se encontraron estados en la base de datos.');
            return res.status(404).json({ error: 'No se encontraron estados' });
        }
 
        console.log(`[SUCCESS] ${results.length} estados obtenidos.`);
        res.json(results);
 
    } catch (error) {
        console.error('[ERROR] Error al obtener estados:', error);
        res.status(500).json({ error: 'Error en el servidor al obtener estados' });
    }
});

app.get('/roles', async (req, res) => {
  console.log('[INFO] Petición recibida para obtener los roles.');

  const sql = `
      SELECT
          idrol,
          descrol
      FROM rol;
  `;

  try {
      console.debug('[DEBUG] Ejecutando consulta SQL para obtener roles.');

      const [results] = await db.promise().query(sql);

      if (results.length === 0) {
          console.warn('[WARN] No se encontraron roles.');
          return res.status(404).json({ error: 'No se encontraron roles' });
      }

      console.info(`[INFO] Consulta exitosa. Roles encontrados: ${results.length}`);
      console.debug('[SUCCESS] Datos de roles enviados al frontend:', results);

      res.json(results);
  } catch (err) {
      console.error('[ERROR] Error al obtener los roles', err);
      res.status(500).json({ error: 'Error al obtener los roles', details: err.message });
  }
});
// Obtiene todos los usuarios
app.get('/usuarios', async (req, res) => {
  console.log('[INFO] Petición recibida para obtener usuarios.');
  try {
    const sql = `
      SELECT u.*, r.descrol
      FROM usuario u 
      JOIN rol r ON u.idrol = r.idrol
    `;
    const [results] = await db.promise().query(sql);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'No se encontraron usuarios.' });
    }

    console.log(`[SUCCESS] ${results.length} usuarios obtenidos.`);
    res.json(results);

  } catch (error) {
    console.error('[ERROR] Error al obtener usuarios:', error);
    res.status(500).json({ error: `Error en el servidor: ${error.message}` });
  }
});


// Obtener usuarios
app.get('/usuarios/filter', async (req, res) => {
  console.log('[INFO] Petición recibida para obtener usuarios.');

  try {
    const sql = `
      SELECT * FROM usuario
      WHERE correo NOT IN (?, ?, ?, ?)
    `;
    const [results] = await db.promise().query(sql, [
      'maguilera@inevada.cl',

      'isalazar@inevada.cl',
      'soporte@inevada.cl',

      'tecnologia@inevada.cl'
    ]);

    if (results.length === 0) {
      console.warn('[WARN] No se encontraron usuarios en la base de datos.');
      return res.status(404).json({ error: 'No se encontraron usuarios' });
    }

    console.log(`[SUCCESS] ${results.length} usuarios obtenidos.`);
    res.json(results);

  } catch (error) {
    console.error('[ERROR] Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error en el servidor al obtener usuarios' });
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
        FROM sociedad s
        JOIN proyecto_sociedad ps ON s.idsociedad = ps.idsociedad
        WHERE ps.idproyecto = ?;
    `;

    try {
        console.debug(`[DEBUG] Ejecutando consulta SQL con idproyecto: ${idproyecto}`);

        const [results] = await db.promise().query(sql, [idproyecto]);

        if (results.length === 0) {
            console.warn(`[WARN] No se encontraron sociedades para el idproyecto: ${idproyecto}`);
            return res.json([]); // <-- Retorna un arreglo vacío en vez de error
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
        FROM sociedad
        WHERE habilitado = 1;
    `;

    try {
        const [results] = await db.promise().query(sql);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener todas las sociedades', details: err.message });
    }
});

// Obtener todas el numero de proyectos
app.get('/proyectos', async (req, res) => {
    const sql = `
        SELECT idproyecto, idpais
        FROM proyecto
        WHERE eliminado = 0 AND habilitado = 1;

    `;

    try {
        const [results] = await db.promise().query(sql);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener todos los proyectos', details: err.message });
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
            p.nombreproyecto,
            p.eliminado
        FROM proyecto p    
        JOIN pais p2 ON p.idpais = p2.idpais  
        JOIN usuario u ON p.idusuario = u.idusuario  
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

app.get('/proyecto/:idproyecto', async (req, res) => {
    const { idproyecto } = req.params;

    console.debug(`[DEBUG] Petición recibida: /proyecto/${idproyecto}`);

    const sql = `
        SELECT
            p.idproyecto,
            p.nombreproyecto,
            p.fecha_inicio,
            p.fecha_termino,
            p.habilitado,
            p.eliminado,
            p2.idpais,
            p2.nombrepais,
            p2.cod,
            s.idsociedad,
            s.nombresociedad

        FROM proyecto p
        JOIN pais p2 ON p.idpais = p2.idpais
        JOIN proyecto_sociedad ps ON p.idproyecto = ps.idproyecto
        JOIN sociedad s ON ps.idsociedad = s.idsociedad
        WHERE p.idproyecto = ?;
    `;

    try {
        console.debug(`[DEBUG] Ejecutando consulta SQL con idproyecto: ${idproyecto}`);

        const [results] = await db.promise().query(sql, [idproyecto]);

        if (results.length === 0) {
            console.warn(`[WARN] No se encontró el proyecto con idproyecto: ${idproyecto}`);
            return res.status(404).json({ error: 'No se encontró el proyecto especificado' });
        }

        console.info(`[INFO] Consulta exitosa. Proyecto encontrado: ${results.length}`);
        console.debug(`[SUCCESS] Datos enviados al frontend:`, results);

        res.json(results[0]); // Devolver el primer resultado si existe
    } catch (err) {
        console.error(`[ERROR] Error al obtener el proyecto para idproyecto: ${idproyecto}`, err);
        res.status(500).json({ error: 'Error al obtener el proyecto', details: err.message });
    }
});






//Modificar un proyecto existente
app.put('/proyecto/:idproyecto', async (req, res) => {
    console.log('[INFO] Petición recibida para modificar un proyecto existente.');
    
    const { idproyecto } = req.params;
    const { idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado, sociedadesSeleccionadas } = req.body;
    
    console.log('[DEBUG] Datos recibidos:', { 
        idproyecto, 
        idpais, 
        idusuario, 
        nombreproyecto, 
        fecha_inicio, 
        fecha_termino, 
        habilitado, 
        sociedadesSeleccionadas 
    });

    // Validaciones básicas
    if (!idproyecto || isNaN(idproyecto)) {
        console.warn('[WARN] ID de proyecto no válido');
        return res.status(400).json({ error: 'ID de proyecto no válido' });
    }

    if (!nombreproyecto || !fecha_inicio || !fecha_termino || habilitado == null) {
        console.warn('[WARN] Datos insuficientes para modificar el proyecto.');
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    if (!Array.isArray(sociedadesSeleccionadas)) {
        console.warn('[WARN] El campo sociedadesSeleccionadas debe ser un array');
        return res.status(400).json({ error: 'El campo sociedadesSeleccionadas debe ser un array' });
    }

    // Iniciamos transacción para asegurar la integridad de los datos
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
        console.log('[DEBUG] Iniciando actualización del proyecto...');
        
        // 1. Actualizar los datos básicos del proyecto
        const sqlUpdateProyecto = `
            UPDATE proyecto 
            SET idpais = ?, 
                nombreproyecto = ?, 
                fecha_inicio = ?, 
                fecha_termino = ?, 
                habilitado = ? 
            WHERE idproyecto = ?
        `;
        const valuesProyecto = [idpais, nombreproyecto, fecha_inicio, fecha_termino, habilitado, idproyecto];
        
        await connection.query(sqlUpdateProyecto, valuesProyecto);
        console.log('[SUCCESS] Proyecto actualizado correctamente.');

        // 2. Gestionar las sociedades relacionadas
        console.log('[DEBUG] Procesando sociedades relacionadas...');

        // 2.1. Obtener las sociedades actuales del proyecto
        const [currentSocieties] = await connection.query(
            'SELECT idsociedad FROM proyecto_sociedad WHERE idproyecto = ?', 
            [idproyecto]
        );
        const currentIds = currentSocieties.map(s => s.idsociedad);

        // 2.2. Si hay sociedades seleccionadas, calcular diferencias
        if (sociedadesSeleccionadas.length > 0) {
            const sociedadesToAdd = sociedadesSeleccionadas.filter(id => !currentIds.includes(id));
            const sociedadesToRemove = currentIds.filter(id => !sociedadesSeleccionadas.includes(id));

            console.log('[DEBUG] Sociedades a añadir:', sociedadesToAdd);
            console.log('[DEBUG] Sociedades a eliminar:', sociedadesToRemove);

            // 2.3. Eliminar relaciones que ya no existen
            if (sociedadesToRemove.length > 0) {
                const placeholders = sociedadesToRemove.map(() => '?').join(', ');
                await connection.query(
                    `DELETE FROM proyecto_sociedad WHERE idproyecto = ? AND idsociedad IN (${placeholders})`,
                    [idproyecto, ...sociedadesToRemove]
                );
                console.log(`[SUCCESS] ${sociedadesToRemove.length} relaciones eliminadas.`);
            }            

            // 2.4. Añadir nuevas relaciones
            if (sociedadesToAdd.length > 0) {
                const insertValues = sociedadesToAdd.map(idsoc => [idproyecto, idsoc]);
                await connection.query(
                    'INSERT INTO proyecto_sociedad (idproyecto, idsociedad) VALUES ?',
                    [insertValues]
                );
                console.log(`[SUCCESS] ${sociedadesToAdd.length} relaciones añadidas.`);
            }

        } else {
            // Si no se seleccionaron sociedades, eliminar todas las existentes
            if (currentIds.length > 0) {
                await connection.query(
                    'DELETE FROM proyecto_sociedad WHERE idproyecto = ?',
                    [idproyecto]
                );
                console.log(`[SUCCESS] Todas las relaciones eliminadas (no se seleccionaron sociedades).`);
            } else {
                console.warn('[WARN] No se seleccionaron sociedades y no existían relaciones previas.');
            }
        }

        // Confirmar la transacción
        await connection.commit();
        console.log('[SUCCESS] Transacción completada con éxito.');

        res.status(200).json({
            idproyecto,
            message: 'Proyecto actualizado exitosamente'
        });

    } catch (error) {
        // Rollback en caso de error
        await connection.rollback();
        console.error('[ERROR] Error al procesar la solicitud:', error.sqlMessage || error.message);
        
        res.status(500).json({ 
            error: 'Error al actualizar el proyecto',
            details: error.sqlMessage || error.message
        });
    } finally {
        connection.release();
    }
});

//Crear un nuevo proyecto
app.post('/proyecto', async (req, res) => {
    console.log('[INFO] Petición recibida para crear un nuevo proyecto.');
    
    const { idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado, sociedadesSeleccionadas, eliminado } = req.body;
    console.log('[DEBUG] Datos recibidos:', { idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado, sociedadesSeleccionadas, eliminado });

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
            INSERT INTO proyecto (idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado, eliminado) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const valuesProyecto = [idpais, idusuario, nombreproyecto, fecha_inicio, fecha_termino, habilitado, eliminado];

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

// Eliminar un proyecto (borrado lógico)
app.delete('/proyecto/:idproyecto', async (req, res) => {
    const { idproyecto } = req.params;
    console.log(`[INFO] Petición recibida para eliminar proyecto con ID: ${idproyecto}`);

    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
        // 1. Eliminar relaciones en proyecto_sociedad si deseas
        await connection.query('DELETE FROM proyecto_sociedad WHERE idproyecto = ?', [idproyecto]);
        console.log(`[SUCCESS] Relaciones proyecto-sociedad eliminadas para el proyecto ${idproyecto}`);

        // 2. Borrado lógico: marcar como eliminado = 1
        await connection.query('UPDATE proyecto SET eliminado = 1 WHERE idproyecto = ?', [idproyecto]);
        console.log(`[SUCCESS] Proyecto ${idproyecto} marcado como eliminado.`);

        await connection.commit();
        res.status(200).json({ message: 'Proyecto eliminado exitosamente (borrado lógico)' });
    } catch (error) {
        await connection.rollback();
        console.error(`[ERROR] Error al eliminar el proyecto ${idproyecto}:`, error);
        res.status(500).json({ error: 'Error al eliminar el proyecto', details: error.message });
    } finally {
        connection.release();
    }
});




  
  // Endpoint para eliminar archivo
  app.delete('/archivo/:idProceso/:nombreArchivo', async (req, res) => {
    const { idProceso, nombreArchivo } = req.params;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
    if (!accessToken) {
      return res.status(401).json({ mensaje: 'Token de acceso no proporcionado' });
    }
  
    try {
      const resultado = await eliminarArchivoSharePoint(accessToken, idProceso, nombreArchivo);
  
      if (resultado.exito) {
        // Establecer conexión a la base de datos
        const connection = await db.promise().getConnection();
        try {
          // Eliminar registro en base de datos
          await connection.query(
            'DELETE FROM archivo WHERE idproceso = ? AND nombrearchivo = ?',
            [idProceso, nombreArchivo]
          );
          console.log(`[INFO] Archivo '${nombreArchivo}' eliminado de la base de datos para el proceso ${idProceso}`);
          return res.status(200).json({ mensaje: 'Archivo eliminado correctamente de SharePoint y base de datos' });
        } finally {
          // Liberar la conexión
          connection.release();
        }
      } else {
        return res.status(500).json({ mensaje: resultado.mensaje, error: resultado.error });
      }
  
    } catch (error) {
      console.error('[ERROR] al procesar la eliminación del archivo:', error.message);
      return res.status(500).json({ mensaje: 'Error inesperado', error: error.message });
    }
  });
  

  //PROCESOS
  //Obtener proceso por idProceso
  app.get('/procesos/:idSociedad/:idProyecto?', async (req, res) => {
    const { idSociedad, idProyecto } = req.params;

    console.debug(`[DEBUG] Petición recibida: /procesos/${idSociedad}${idProyecto ? '/' + idProyecto : ''}`);

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
            r2.nombreusuario AS revisor_nombre,
            a.ruta AS link,
            a.nombrearchivo
        FROM proceso p
        JOIN proyecto_sociedad ps 
            ON p.idsociedad = ps.idsociedad AND p.idproyecto = ps.idproyecto
        LEFT JOIN sociedad s ON p.idsociedad = s.idsociedad
        LEFT JOIN estado e ON p.idestado = e.idestado
        LEFT JOIN usuario r1 ON p.responsable = r1.idusuario
        LEFT JOIN usuario r2 ON p.revisor = r2.idusuario
        LEFT JOIN archivo a ON p.idproceso = a.idproceso
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
            console.warn(`[WARN] No se encontraron procesos para la sociedad ${idSociedad}${idProyecto ? ' y proyecto ' + idProyecto : ''}`);
            return res.status(200).json({ mensaje: 'No hay procesos para los parámetros especificados', data: [] });
        }

        // Agrupamos los procesos
        const procesosMap = new Map();

        for (const row of results) {
            if (!procesosMap.has(row.idproceso)) {
                procesosMap.set(row.idproceso, {
                    idproceso: row.idproceso,
                    idproyecto: row.idproyecto,
                    idsociedad: row.idsociedad,
                    nombreproceso: row.nombreproceso,
                    fecha_inicio: row.fecha_inicio,
                    fecha_fin: row.fecha_fin,
                    responsable: row.responsable,
                    revisor: row.revisor,
                    idestado: row.idestado,
                    nombresociedad: row.nombresociedad,
                    descestado: row.descestado,
                    responsable_nombre: row.responsable_nombre,
                    revisor_nombre: row.revisor_nombre,
                    archivos: []
                });
            }

            if (row.link) {
                procesosMap.get(row.idproceso).archivos.push({
                    link: row.link,
                    nombre: row.nombrearchivo
                });
            }
        }

        const procesosAgrupados = Array.from(procesosMap.values());

        console.info(`[INFO] Procesos agrupados correctamente. Total: ${procesosAgrupados.length}`);
        console.debug(`[SUCCESS] Datos agrupados enviados al frontend:`, procesosAgrupados);

        res.json(procesosAgrupados);
    } catch (err) {
        console.error(`[ERROR] Error al obtener procesos, ${err}`);
        res.status(500).json({ error: 'Error al obtener procesos', details: err.message });
    }
});







const upload2 = multer();

app.put('/proceso/:idproceso', upload2.array('archivos'), async (req, res) => {
  const { idproceso } = req.params;
  const {
    nombreproceso,
    fecha_inicio,
    fecha_fin,
    responsable,
    revisor,
    idestado
  } = req.body;

  const archivos = req.files;
  const accessToken = req.headers.authorization?.split(' ')[1];
  const overwrite = req.query.overwrite === 'true';
  const revisorFinal = !revisor || revisor === 'null' ? null : revisor;

  // ---------- VALIDACIONES ----------
  if (!idproceso) return res.status(400).json({ error: 'ID de proceso requerido' });
  if (!nombreproceso || typeof nombreproceso !== 'string')
    return res.status(400).json({ error: 'Nombre de proceso inválido' });
  if (!fecha_inicio || isNaN(Date.parse(fecha_inicio)))
    return res.status(400).json({ error: 'Fecha de inicio inválida' });
  if (!fecha_fin || isNaN(Date.parse(fecha_fin)))
    return res.status(400).json({ error: 'Fecha de fin inválida' });
  if (new Date(fecha_inicio) > new Date(fecha_fin))
    return res.status(400).json({ error: 'La fecha de inicio no puede ser posterior a la fecha de fin' });
  if (!responsable) return res.status(400).json({ error: 'Responsable requerido' });
  if (!idestado) return res.status(400).json({ error: 'Estado del proceso requerido' });

  if (archivos?.length && !accessToken)
    return res.status(401).json({ error: 'No autorizado: falta token para subir archivos' });

  if (archivos?.some(f => !f.originalname))
    return res.status(400).json({ error: 'Todos los archivos deben tener nombre válido' });

  try {
    // ---------- ACTUALIZAR PROCESO ----------
    const updateSQL = `
      UPDATE proceso
      SET 
        nombreproceso = ?,
        fecha_inicio = ?,
        fecha_fin = ?,
        responsable = ?,
        revisor = ?,
        idestado = ?
      WHERE idproceso = ?
    `;
    const [result] = await db.promise().query(updateSQL, [
      nombreproceso,
      fecha_inicio,
      fecha_fin,
      responsable,
      revisorFinal,
      idestado,
      idproceso
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Proceso no encontrado para actualizar' });
    }

    // ---------- GESTIONAR PERMISO RESPONSABLE ----------
    try {
      await gestionarPermisoUsuarioEnSharePoint(accessToken, idproceso, responsable);
    } catch (permError) {
      console.warn(`[SharePoint] No se pudo gestionar permisos para ${responsable}:`, permError.message);
    }

    // ---------- SUBIR ARCHIVOS ----------
    let archivosSubidos = [];

    if (archivos?.length) {
      for (const archivo of archivos) {
        const nombreArchivo = archivo.originalname;

        const [existentes] = await db.promise().query(`
          SELECT * FROM archivo WHERE idproceso = ? AND nombrearchivo = ?
        `, [idproceso, nombreArchivo]);

        if (existentes.length > 0) {
          if (!overwrite) {
            return res.status(409).json({
              error: 'Ya existe un archivo con ese nombre',
              nombreArchivo
            });
          }

          await eliminarArchivoSharePoint(accessToken, idproceso, nombreArchivo);
          const nuevoArchivo = await subirArchivoASharepoint(accessToken, idproceso, archivo, true);

          await db.promise().query(`
            UPDATE archivo SET ruta = ?, nombrearchivo = ?
            WHERE idarchivo = ?
          `, [nuevoArchivo.rutaArchivo, nuevoArchivo.nombreArchivo, existentes[0].idarchivo]);

          archivosSubidos.push(nuevoArchivo);
        } else {
          const nuevoArchivo = await subirArchivoASharepoint(accessToken, idproceso, archivo);

          await db.promise().query(`
            INSERT INTO archivo (idproceso, ruta, nombrearchivo)
            VALUES (?, ?, ?)
          `, [idproceso, nuevoArchivo.rutaArchivo, nuevoArchivo.nombreArchivo]);

          archivosSubidos.push(nuevoArchivo);
        }
      }
    }

    res.json({
      mensaje: 'Proceso actualizado correctamente',
      archivosSubidos: archivosSubidos.length ? archivosSubidos : null
    });

  } catch (err) {
    console.error('[ERROR] Error al actualizar proceso:', err);
    res.status(500).json({ error: 'Error al actualizar proceso', detalle: err.message });
  }
});


const uploadArchivos = multer();

app.post('/proceso/:idproceso/archivos', uploadArchivos.array('archivos'), async (req, res) => {
  const { idproceso } = req.params;
  const archivos = req.files;
  const accessToken = req.headers.authorization?.split(' ')[1];
  const overwrite = req.query.overwrite === 'true';

  if (!idproceso) return res.status(400).json({ error: 'ID de proceso requerido' });

  if (!archivos?.length) return res.status(400).json({ error: 'No se recibieron archivos' });

  if (!accessToken) return res.status(401).json({ error: 'No autorizado: falta token' });

  try {
    let archivosSubidos = [];

    for (const archivo of archivos) {
      const nombreArchivo = archivo.originalname;

      if (!nombreArchivo) {
        return res.status(400).json({ error: 'Todos los archivos deben tener nombre válido' });
      }

      // Verificar si ya existe
      const [existentes] = await db.promise().query(`
        SELECT * FROM archivo WHERE idproceso = ? AND nombrearchivo = ?
      `, [idproceso, nombreArchivo]);

      if (existentes.length > 0) {
        if (!overwrite) {
          return res.status(409).json({
            error: 'Ya existe un archivo con ese nombre',
            nombreArchivo
          });
        }

        // Eliminar de SharePoint
        await eliminarArchivoSharePoint(accessToken, idproceso, nombreArchivo);

        // Subir nuevo archivo
        const nuevoArchivo = await subirArchivoASharepoint(accessToken, idproceso, archivo, true);

        // Actualizar registro
        await db.promise().query(`
          UPDATE archivo SET ruta = ?, nombrearchivo = ? WHERE idarchivo = ?
        `, [nuevoArchivo.rutaArchivo, nuevoArchivo.nombreArchivo, existentes[0].idarchivo]);

        archivosSubidos.push(nuevoArchivo);
      } else {
        // Subir y registrar nuevo archivo
        const nuevoArchivo = await subirArchivoASharepoint(accessToken, idproceso, archivo);
        await db.promise().query(`
          INSERT INTO archivo (idproceso, ruta, nombrearchivo)
          VALUES (?, ?, ?)
        `, [idproceso, nuevoArchivo.rutaArchivo, nuevoArchivo.nombreArchivo]);

        archivosSubidos.push(nuevoArchivo);
      }
    }

    res.json({
      mensaje: 'Archivos subidos correctamente',
      archivosSubidos
    });

  } catch (err) {
    console.error('[ERROR] Al subir archivos:', err);
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  }
});

  

  //Crear procesos
  const upload = multer();
  app.post('/procesos', upload.array('archivos'), async (req, res) => {
    const connection = await db.promise().getConnection();
  
    try {
      const {
        idsociedad,
        idproyecto,
        nombreproceso,
        fecha_inicio,
        fecha_fin,
        responsable,
        revisor,
        idestado,
        crear_archivo_en_blanco,
      } = req.body;
  
      const accessToken = req.headers.authorization?.split(' ')[1];
      if (!accessToken) {
        return res.status(400).json({ error: 'Access token es requerido' });
      }
  
      const archivosSubidos = req.files; // <- ahora es un array
  
      // Validaciones
      const errores = [];
      if (!idsociedad) errores.push('idsociedad es requerido.');
      if (!idproyecto) errores.push('idproyecto es requerido.');
      if (!nombreproceso) errores.push('nombreproceso es requerido.');
      if (!fecha_inicio) errores.push('fecha_inicio es requerido.');
      if (!responsable) errores.push('responsable es requerido.');
      if (idestado === undefined) errores.push('idestado es requerido.');
      if (errores.length > 0) return res.status(400).json({ error: errores.join(' ') });
  
      if (fecha_inicio && fecha_fin && new Date(fecha_fin) < new Date(fecha_inicio)) {
        return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio.' });
      }
  
      // Iniciar transacción
      await connection.beginTransaction();
  
      const [procesoResult] = await connection.execute(`
        INSERT INTO proceso 
        (idsociedad, idproyecto, nombreproceso, fecha_inicio, fecha_fin, responsable, revisor, idestado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idsociedad,
          idproyecto,
          nombreproceso,
          fecha_inicio,
          fecha_fin || null,
          responsable,
          revisor || null,
          idestado
        ]
      );
  
      const idproceso = procesoResult.insertId;
  
      // Manejo de archivos
      if (crear_archivo_en_blanco === 'true') {
        const archivoResult = await crearCarpetaYArchivoEnBlancoSharepoint(accessToken, idproceso);
        if (archivoResult) {
          const { rutaArchivo, nombreArchivo } = archivoResult;
          await connection.execute(
            'INSERT INTO archivo (idproceso, ruta, nombrearchivo) VALUES (?, ?, ?)',
            [idproceso, rutaArchivo, nombreArchivo]
          );
        }
      } else if (archivosSubidos?.length) {
        for (const archivo of archivosSubidos) {
          const archivoResult = await subirArchivoASharepoint(accessToken, idproceso, archivo);
          if (archivoResult) {
            const { rutaArchivo, nombreArchivo } = archivoResult;
            await connection.execute(
              'INSERT INTO archivo (idproceso, ruta, nombrearchivo) VALUES (?, ?, ?)',
              [idproceso, rutaArchivo, nombreArchivo]
            );
          }
        }
      }
  
      await connection.commit();
      res.status(201).json({ message: 'Proceso creado exitosamente', idproceso });
  
    } catch (error) {
      await connection.rollback();
      console.error('Error al crear el proceso:', error);
      res.status(500).json({ error: 'Error al crear el proceso.' });
    } finally {
      connection.release();
    }
  });
  
  


// Obtener procesos para una sociedad por idSociedad e idproyecto
app.get('/procesos/:idSociedad/:idProyecto?', async (req, res) => {
    const { idSociedad, idProyecto } = req.params;

    console.debug(`[DEBUG] Petición recibida: /procesos/${idSociedad}${idProyecto ? '/' + idProyecto : ''}`);

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
            r2.nombreusuario AS revisor_nombre,
            a.ruta AS link
        FROM proceso p
        JOIN proyecto_sociedad ps 
            ON p.idsociedad = ps.idsociedad AND p.idproyecto = ps.idproyecto
        LEFT JOIN sociedad s ON p.idsociedad = s.idsociedad
        LEFT JOIN estado e ON p.idestado = e.idestado
        LEFT JOIN usuario r1 ON p.responsable = r1.idusuario
        LEFT JOIN usuario r2 ON p.revisor = r2.idusuario
        LEFT JOIN archivo a ON p.idproceso = a.idproceso
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
            console.warn(`[WARN] No se encontraron procesos para la sociedad ${idSociedad}${idProyecto ? ' y proyecto ' + idProyecto : ''}`);
            return res.status(200).json({ mensaje: 'No hay procesos para los parámetros especificados', data: [] });
        }

        console.info(`[INFO] Consulta exitosa. Procesos encontrados: ${results.length}`);
        console.debug(`[SUCCESS] Datos enviados al frontend:`, results);

        res.json(results);
    } catch (err) {
        console.error(`[ERROR] Error al obtener procesos, ${err}`);
        res.status(500).json({ error: 'Error al obtener procesos', details: err.message });
    }
});

//eliminar proceso


  //Obtener proceso por idProceso para editar el proceso
  app.get('/proceso/:idproceso', async (req, res) => {
    const { idproceso } = req.params;

    console.debug(`[DEBUG] Petición recibida: /proceso/${idproceso}`);

    const sql = `
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
            r2.nombreusuario AS revisor_nombre,
            a.ruta AS link,
            a.nombrearchivo
        FROM proceso p
        JOIN proyecto_sociedad ps 
            ON p.idsociedad = ps.idsociedad AND p.idproyecto = ps.idproyecto
        LEFT JOIN sociedad s ON p.idsociedad = s.idsociedad
        LEFT JOIN estado e ON p.idestado = e.idestado
        LEFT JOIN usuario r1 ON p.responsable = r1.idusuario
        LEFT JOIN usuario r2 ON p.revisor = r2.idusuario
        LEFT JOIN archivo a ON p.idproceso = a.idproceso
        WHERE p.idproceso = ?
    `;

    try {
        console.debug(`[DEBUG] Ejecutando consulta SQL con param: ${idproceso}`);

        const [results] = await db.promise().query(sql, [idproceso]);

        if (results.length === 0) {
            console.warn(`[WARN] No se encontró ningún proceso con idproceso: ${idproceso}`);
            return res.status(404).json({ mensaje: 'Proceso no encontrado' });
        }

        const proceso = {
            idproceso: results[0].idproceso,
            idproyecto: results[0].idproyecto,
            idsociedad: results[0].idsociedad,
            nombreproceso: results[0].nombreproceso,
            fecha_inicio: results[0].fecha_inicio,
            fecha_fin: results[0].fecha_fin,
            responsable: results[0].responsable,
            revisor: results[0].revisor,
            idestado: results[0].idestado,
            nombresociedad: results[0].nombresociedad,
            descestado: results[0].descestado,
            responsable_nombre: results[0].responsable_nombre,
            revisor_nombre: results[0].revisor_nombre,
            archivos: []
        };

        for (const row of results) {
            if (row.link) {
                proceso.archivos.push({
                    link: row.link,
                    nombre: row.nombrearchivo
                });
            }
        }

        console.info(`[INFO] Proceso con archivos agrupado correctamente.`);
        console.debug(`[SUCCESS] Datos enviados al frontend:`, proceso);

        res.json(proceso);
    } catch (err) {
        console.error(`[ERROR] Error al obtener el proceso, ${err}`);
        res.status(500).json({ error: 'Error al obtener proceso', details: err.message });
    }
});



  app.delete('/proceso/:idproceso', async (req, res) => {
    const { idproceso } = req.params;
    const accessToken = req.headers['authorization']?.replace('Bearer ', '');
  
    if (!accessToken) {
      return res.status(401).json({ mensaje: 'Access token no proporcionado' });
    }
  
    console.debug(`[DEBUG] Petición DELETE recibida: /proceso/${idproceso}`);
  
    // Paso 1: Eliminar carpeta en SharePoint
    const resultadoCarpeta = await eliminarCarpetaSharePoint(accessToken, idproceso);
  
    if (!resultadoCarpeta.exito) {
      return res.status(500).json({
        mensaje: 'Error al eliminar carpeta en SharePoint',
        error: resultadoCarpeta.error
      });
    }
  
    // Paso 2: Eliminar proceso en base de datos
    const sql = 'DELETE FROM proceso WHERE idproceso = ?';
  
    try {
      const [result] = await db.promise().query(sql, [idproceso]);
  
      if (result.affectedRows === 0) {
        console.warn(`[WARN] No se encontró ningún proceso con idproceso: ${idproceso}`);
        return res.status(404).json({ mensaje: 'Proceso no encontrado o ya eliminado' });
      }
  
      console.info(`[INFO] Proceso y carpeta eliminados. idproceso: ${idproceso}`);
      res.json({ mensaje: 'Proceso y carpeta eliminados correctamente' });
    } catch (err) {
      console.error(`[ERROR] Error al eliminar proceso de la base de datos: ${err}`);
      res.status(500).json({ mensaje: 'Error al eliminar proceso', error: err.message });
    }
  });


//endpoints para los breadcrumbs:
// Obtener un país por ID
app.get('/pais/:idPais', async (req, res) => {
    const { idPais } = req.params;
    console.log(`[INFO] Petición recibida para obtener el país con ID: ${idPais}`);

    try {
        const sql = `SELECT * FROM pais WHERE idpais = ?`;
        const [results] = await db.promise().query(sql, [idPais]);

        if (results.length === 0) {
            console.warn(`[WARN] No se encontró un país con el ID: ${idPais}`);
            return res.status(404).json({ error: 'No se encontró un país con el ID especificado' });
        }

        console.log(`[SUCCESS] País obtenido con éxito:`, results[0]);
        res.json(results[0]);
    } catch (error) {
        console.error('[ERROR] Error al obtener el país:', error);
        res.status(500).json({ error: 'Error en el servidor al obtener el país' });
    }
});



// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[SUCCESS] Servidor corriendo en http://localhost:${PORT}`);
});