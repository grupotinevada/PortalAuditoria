import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IUsuario } from '../models/user.model';
import { IPais } from 'src/models/pais.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl.api;

  constructor(private http: HttpClient) {}

  // Guardar usuario en la base de datos
  guardarUsuario(usuario: IUsuario): Observable<IUsuario> {
    return this.http.post<IUsuario>(`${this.apiUrl}/usuarios`,usuario);
  }

  obtenerPerfil(usuarioId: string, CorreoElectronico: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.get<any>(`${this.apiUrl}/usuario/${usuarioId}/${CorreoElectronico}/perfil`);
  }
  
  obtenerPaises(){
    return this.http.get<IPais[]>(`${this.apiUrl}/pais`);
  }

  // Obtener usuario actual desde sessionStorage
  getCurrentUser(): IUsuario | null {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) as IUsuario : null;
  }

  obtenerUsuarios(){
    return this.http.get<IUsuario[]>(`${this.apiUrl}/usuarios`);
  }

  enviarTokensAlBackend(accessToken: string, idToken: string): Observable<any> {
    return this.http.post(`${environment.apiUrl.api}/auth/tokens`, {
      accessToken,
      idToken
    });
  }
  
}
