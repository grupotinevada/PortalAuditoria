export interface IProceso{
    idproceso: number | null,
    idsociedad: number | null,
    nombreproceso: string | null,
    fecha_inicio: Date | null,
    fecha_termino: Date | null,
    responsable: string | null,
    revisor: string | null,
    idestado: number | null
}