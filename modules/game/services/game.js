const jwt = require('jsonwebtoken');

module.exports = {
   // gameId необязателен: у админских токенов игры нет, и тогда ключа в
   // полезной нагрузке не будет вовсе — «нет привязки» читается по его отсутствию.
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
