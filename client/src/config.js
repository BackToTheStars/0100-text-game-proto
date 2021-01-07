let API_URL = '';
let LOBBY_PAGE_URL = 'http://localhost:3001';
if ((typeof process !== 'undefined') && process.env.API_URL) {
  API_URL = process.env.API_URL;
  LOBBY_PAGE_URL = process.env.LOBBY_PAGE_URL;
}

// откуда взять process.env.HASH ?

export {
  API_URL,
  LOBBY_PAGE_URL
}