export const environment = {
  production: true,
  msalConfig: {
    auth: {
      clientId: '3c80ebaa-b040-451f-ac61-b03bda128e74',
      authority: 'https://login.microsoftonline.com/ed03816d-2e9a-44a8-977a-c69b5b3724d0/',
    },
  },
  apiConfig: {
    scopes: ['user.read', 'mail.read', 'openid', 'profile'],
    uri: 'https://graph.microsoft.com/v1.0/me',
  },
  apiUrl: {
    api: 'http://localhost:3000'
  },
  sharepointId: '992e0913-eb95-4859-8b32-32c6b686c500',
  siteName: 'PruebaAuditoria',
  driveName: 'Biblioteca Prueba Auditoria'
};
