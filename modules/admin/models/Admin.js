const argon2 = require('argon2');

const Admin = {
  findOne: async (params) => {
    const { nickname, id } = params;
    if (!nickname && !id) {
      return null;
    }
    if (nickname && nickname !== process.env.USER_NICKNAME) {
      return null;
    }
    if (id && id !== 1) {
      return null;
    }
    return {
      _id: 1,
      nickname: process.env.USER_NICKNAME,
      password: await argon2.hash(process.env.USER_PASSWORD),
    };
  },
};

module.exports = Admin;
