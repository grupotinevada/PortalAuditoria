import { MsalService } from '@azure/msal-angular';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IUsuario } from '../models/user.model';
import { IPais } from 'src/models/pais.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl.api;
  profile: IUsuario | null = null;

  constructor(private http: HttpClient, private msalService: MsalService) {}


getProfile(): IUsuario | null {
  const userData = sessionStorage.getItem('userData');
  if (userData) {
    console.log('data', userData);
    this.profile = JSON.parse(userData) as IUsuario;
  } else {
    this.profile = null;
  }

  return this.profile; // RETORNAR EL VALOR
}


  obtenerRoles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/roles`);
  }



  // Guardar usuario en la base de datos
  guardarUsuario(usuario: IUsuario, accessToken: string): Observable<IUsuario> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`
    });
  
    return this.http.post<IUsuario>(`${this.apiUrl}/usuarios`, usuario, { headers });
  }
  

  obtenerPerfil(usuarioId: string, CorreoElectronico: string) {

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

  obtenerTodosLosUsuarios(){
    return this.http.get<IUsuario[]>(`${this.apiUrl}/usuarios`);
  }

  obtenerUsuariosFiltrados(){
    return this.http.get<IUsuario[]>(`${this.apiUrl}/usuarios/filter`);
  }

  enviarTokensAlBackend(accessToken: string, idToken: string): Observable<any> {
    return this.http.post(`${environment.apiUrl.api}/auth/tokens`, {
      accessToken,
      idToken
    });
  }
  
  // Método para obtener la foto de perfil que devuelve una Promise con la URL
obtenerFotoPerfil(userName: string, userId: string): Promise<string> {
  return new Promise((resolve) => {
    // Intenta obtener la foto desde Microsoft Graph
    this.http.get('https://graph.microsoft.com/v1.0/me/photo/$value', { 
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => {
        // Convierte el blob a una URL de datos (data URL)
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
      },
      error: (err) => {
        console.error('Error al obtener la foto de perfil:', err);
        // Usa el generador de avatar como fallback
        resolve(this.generateInitialsAvatar(userName, userId));
      }
    });
  });
}

// Método para generar avatar con iniciales
generateInitialsAvatar(name: string, userId: string): string {
  // Extraer iniciales (máximo 2 caracteres)
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Generar un color basado en el userId
  const colors = [
    '#37474F', '#455A64', '#546E7A', '#607D8B', '#78909C',
    '#90A4AE', '#B0BEC5', '#CFD8DC', '#ECEFF1', '#F5F5F5',
    '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161',
    '#424242', '#212121', '#263238', '#37474F', '#455A64',
    '#546E7A', '#607D8B', '#78909C', '#90A4AE', '#B0BEC5',
    '#CFD8DC', '#ECEFF1', '#F5F5F5', '#E0E0E0', '#BDBDBD'
  ];
  
  
  let colorIndex = 0;
  for (let i = 0; i < userId.length; i++) {
    colorIndex += userId.charCodeAt(i);
  }
  colorIndex = colorIndex % colors.length;
  const bgColor = colors[colorIndex];
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <rect width="40" height="40" fill="${bgColor}" />
      <text x="20" y="25" font-family="Arial" font-size="16" fill="white" text-anchor="middle">${initials}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}






//TENNANT INFO
getAccessToken(): Promise<string> {
  return this.msalService.instance
    .acquireTokenSilent({
      scopes: environment.apiConfig.scopes,
      account: this.msalService.instance.getActiveAccount() || undefined,
    })
    .then(result => result.accessToken);
}

async getUsers() {
  const token = await this.getAccessToken();
  return this.http.get('https://graph.microsoft.com/v1.0/users', {
    headers: { Authorization: `Bearer ${token}` },
  }).toPromise();
}

async getUserById(id: string) {
  const token = await this.getAccessToken();
  return this.http.get(`https://graph.microsoft.com/v1.0/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).toPromise();
}
}

