export interface IUsuario {
  idusuario?: string;
  nombreUsuario: string | null;
  correo: string;
  habilitado: number | null;
  idrol: number;
  descrol?: string | null;
  fotoPerfil?: string | null;
}
