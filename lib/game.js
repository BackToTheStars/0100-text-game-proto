const jwt = require('jsonwebtoken');

module.exports = {
   getToken: function (secret, operation, timestamp, hash)
   {
     return jwt.sign(
       {
         operation: operation,
         timestamp: timestamp,
         hash: hash
       },
       secret
     )
    },
   checkToken: function (secret, token)
   {
     return new Promise(
       (resolve, reject) => {

         jwt.verify(token, secret, (err, payload) => {

           //console.log(err)
           if (err) return reject(err)
           if (!payload.timestamp || payload.timestamp < new Date().getTime() ) return reject(new Error("token expired"))

           resolve(payload)

         })

       }
     )

   }
}
