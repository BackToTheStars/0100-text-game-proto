const jwt = require('jsonwebtoken');
const { ROLE_GAME_VISITOR } = require('../../../config/game/user');
const { getInfo } = require('./security');
const { getError } = require('../../core/services/errors');

// Одна проверка «хеш игры + game-token» на обе поверхности: HTTP (gameMiddleware
// кладёт результат в req.gameInfo) и сокет присутствия (первое сообщение hello).
// Раньше проверка жила внутри middleware, и у сокета была бы своя копия,
// которая разошлась бы с оригиналом при первой же правке.
//
// Возвращает { gameId, role, code, nickname, v } (code, nickname и v — только
// когда токен принят) или бросает ошибку с statusCode, текстом и машинным
// errorCode, которые middleware отдаёт клиенту как есть: 409 / 404 / 401.
//
// requireToken — режим сокета присутствия и ручки обновления токена: токен
// обязателен, истёкший отвергается. В HTTP-режиме (по умолчанию) отсутствие
// токена и истёкший токен — посетитель: клиент штатно обновляет токен через
// POST /codes/refresh, и до обновления у него остаётся только чтение.

const verifyGameToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] },
      (err, decoded) => (err ? reject(err) : resolve(decoded))
    );
  });

const resolveGameAccess = async ({ hash, token, requireToken = false }) => {
  const { gameId, role, ambiguous } = await getInfo(hash);
  if (ambiguous) {
    // Этот адрес занят больше чем одной игрой. Раньше сервер молча отдавал
    // старшую из них — так запрос к одной игре уходил в другую.
    throw getError('Хеш игры неоднозначен', 409, 'game-ambiguous');
  }
  if (!gameId) {
    throw getError('Игра не найдена', 404, 'game-not-found');
  }

  if (!token) {
    if (requireToken) {
      throw getError('Нужен game-token', 401, 'token-missing');
    }
    return { gameId, role: ROLE_GAME_VISITOR };
  }

  let decoded;
  try {
    decoded = await verifyGameToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      if (requireToken) {
        throw getError('Токен истёк', 401, 'token-expired');
      }
      // Протухший токен — штатная ситуация: клиент обновляет его через
      // POST /codes/refresh, поэтому продолжаем как посетитель.
      return { gameId, role };
    }
    // Подделанная подпись или битый токен раньше молча превращались
    // в посетителя — ошибка была не видна.
    throw getError('Некорректный game-token', 401, 'token-invalid');
  }

  // Роль берётся из токена, а игра — из адреса в запросе. Пока токен
  // не говорил, для какой игры он выписан, владелец собственной игры
  // был владельцем любой чужой, чей адрес знает (а адреса публичных
  // игр видны в лобби). Отвечаем 401, а не 403: на 401 клиент снимает
  // сохранённый доступ и ведёт в диалог входа, на 403 — показал бы
  // alert и оставил негодный токен в хранилище.
  const tokenGameId = decoded.data?.gameId;
  if (!tokenGameId) {
    // Токены, выписанные до появления этой проверки, игры не называют —
    // доверять им нельзя. Разовый перелогин всех после выката.
    throw getError('Токен устарел, войдите заново', 401, 'token-stale');
  }
  if ('' + tokenGameId !== '' + gameId) {
    throw getError('Токен выписан на другую игру', 401, 'token-foreign-game');
  }

  return {
    gameId,
    code: decoded.data?.code,
    role: decoded.data.role,
    nickname: decoded.data.nickname || 'Unknown', // проверка того, что пользователь зашёл
    v: decoded.data?.v,
  };
};

module.exports = {
  resolveGameAccess,
};
