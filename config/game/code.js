// Длины адреса игры и кода доступа в hex-символах. Переменная окружения
// GAME_ID_HASH_LENGTH больше не читается: она задавала случайный хвост кода,
// а на проде осталась в .env равной 3.
const ADDRESS_LENGTH = 6;
const CODE_LENGTH = 8;

module.exports = {
  ADDRESS_LENGTH,
  CODE_LENGTH,
};
