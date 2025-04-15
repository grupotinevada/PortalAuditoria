export interface IProceso {
    idproceso: number | null | string;
    idproyecto: number | null;           // <-- agregado
    idsociedad: number | null;
    nombresociedad: string | null;
    nombreproceso: string | null;
    fecha_inicio: Date | null;
    fecha_fin: Date | null;
    responsable: string | null;
    responsable_nombre: string | null;
    revisor: string | null;
    revisor_nombre: string | null;
    idestado: number | null;
    descestado: string | null;
    link: string | null;
    nombrearchivo?: string | null;       
  }
  