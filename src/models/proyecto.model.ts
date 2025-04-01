export interface IProyecto {
    ProyectoID: number;
    NombreProyecto: string;
    FechaInicio: Date | null;
    FechaFin: Date | null;
    habilitado: number;
    descEstado: string;
    PaisID: number;
    NombrePais: string;
    cod: string;
    AuditorNombre: string;
    AuditorIdPerfil: number;
    AuditorCorreo: string;
    RevisorNombre: string;
    RevisorIdPerfil: number;
    RevisorCorreo: string;
}
