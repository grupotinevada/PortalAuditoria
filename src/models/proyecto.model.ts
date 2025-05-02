export interface IProyecto {
    idpais: number | null;
    idusuario: string | null;
    nombrepais: string | null;
    cod: string | null;
    nombreUsuario: string | null;
    correo: string | null;
    idproyecto: number | null;
    fecha_inicio: Date | string | null;
    fecha_termino: Date | string | null;
    habilitado: number | null | boolean;
    eliminado: number | null;
    nombreproyecto: string | null;
    sociedadesSeleccionadas?: number[] | null; // Cambiado a un array de números
}