const jwt = require('jsonwebtoken');

// media принимает все операции, кроме upload, только с этой меткой; в токен
// загрузки, который получает игрок, она не попадает.
const SERVICE_SCOPE = 'service';
const SERVICE_TOKEN_TTL = 5 * 60 * 1000;

const buildServicePayload = (operation, { hash, gameId } = {}, now = Date.now()) => {
  const payload = {
    operation,
    timestamp: now + SERVICE_TOKEN_TTL,
    scope: SERVICE_SCOPE,
  };
  if (typeof hash === 'string' && hash) {
    payload.hash = hash;
  }
  // Без игры ключей нет вовсе: «нет привязки» media читает по их отсутствию.
  if (gameId) {
    payload.gameId = String(gameId);
  }
  return payload;
};

module.exports = {
   SERVICE_SCOPE,
   SERVICE_TOKEN_TTL,
   buildServicePayload,
   getToken: function (secret, operation, timestamp, hash, gameId)
   {
     const payload = {
       operation: operation,
       timestamp: timestamp,
       hash: hash
     };
     if (gameId) {
       payload.gameId = '' + gameId;
     }

     return jwt.sign(payload, secret)
    },
   getServiceToken: function (operation, game)
   {
     return jwt.sign(buildServicePayload(operation, game), process.env.JWT_SECRET_STATIC)
   },
   checkToken: function (secret, token)
   {
     return new Promise(
       (resolve, reject) => {

         jwt.verify(token, secret, { algorithms: ['HS256'] }, (err, payload) => {

           //console.log(err)
           if (err) return reject(err)
           if (!payload.timestamp || payload.timestamp < new Date().getTime() ) return reject(new Error("token expired"))

           resolve(payload)

         })

       }
     )

   }
}
