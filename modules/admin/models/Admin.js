const bcrypt = require('bcrypt');
const saltRounds = 10;

const Admin = {
  findOne: (params) => {
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
      password: bcrypt.hashSync(process.env.USER_PASSWORD, saltRounds),
    };
  },
};

module.exports = Admin;
