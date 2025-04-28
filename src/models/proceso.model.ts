/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IArchivo {
  link: string | null;
  nombre: string | null;
}

export interface IProceso {
  idproceso: number | null | string;
  idproyecto: number | null;
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
  archivos: IArchivo[]; // <-- Aquí se almacenan múltiples archivos
  [key: string]: any;
}
