const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Права для работы со списком игр
const USER_MODE_ADMIN = 1;
const USER_MODE_VISITOR = 2;

// Права для работы внутри игры
// При изменении нужно дублировать на клиенте
const ROLE_VIEW = 1;
const ROLE_EDIT = 2; // остаётся вопрос, можно ли удалять чужие ходы (по идее, нельзя)
const ROLE_HASH = 3; // может выдавать хэши ?

const ADMIN_ID = 1; // временный id

const schema = new Schema(
  {
    nickName: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

schema.statics = {
  ids: {
    ADMIN_ID,
  },
  roles: {
    ROLE_VIEW,
    ROLE_EDIT,
  },
  user_modes: {
    USER_MODE_ADMIN,
    USER_MODE_VISITOR,
  },
};

module.exports = mongoose.model('User', schema, 'users');
