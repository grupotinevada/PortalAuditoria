export const environment = {
  production: false,
  msalConfig: {
    auth: {
      clientId: '3c80ebaa-b040-451f-ac61-b03bda128e74',
      authority: 'https://login.microsoftonline.com/ed03816d-2e9a-44a8-977a-c69b5b3724d0/',
    },
  },
  apiConfig: {
    scopes: [
      'user.read', 
      'mail.read', 
      'openid', 
      'profile',
      'Sites.Read.All',
      'Files.ReadWrite.All',
    ],
    uri: 'https://graph.microsoft.com/v1.0/me',
  },
  apiUrl: {
    api: 'http://localhost:3000'
  }
};


