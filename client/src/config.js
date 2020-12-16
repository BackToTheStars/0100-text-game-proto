let API_URL = ''
if ((typeof process !== 'undefined') && process.env.API_URL) {
  API_URL = process.env.API_URL
}

export {
  API_URL
}