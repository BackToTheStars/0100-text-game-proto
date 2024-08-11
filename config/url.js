const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3002';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const STATIC_API_URL = process.env.STATIC_API_URL || 'http://localhost:3003';
const STATIC_AUDIO_URL =
  process.env.NEXT_PUBLIC_STATIC_AUDIO_URL || 'http://localhost:3010';

module.exports = {
  CLIENT_URL,
  API_URL,
  STATIC_API_URL,
  STATIC_AUDIO_URL,
};
