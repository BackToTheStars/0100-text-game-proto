const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const USER_MODE_ADMIN = 1;
const USER_MODE_VISITOR = 2;

const RULE_VIEW = 1;
const RULE_EDIT = 2;  // остаётся вопрос, можно ли удалять чужие ходы (по идее, нельзя)

const ADMIN_ID = 1;   // временный id

const schema = new Schema({
  nickName: {
    type: String,
    required: false
  }
}, { timestamps: true });

schema.statics = {
  ids: {
    ADMIN_ID
  },
  rules: {
    RULE_VIEW,
    RULE_EDIT
  },
  user_modes: {
    USER_MODE_ADMIN,
    USER_MODE_VISITOR
  }
}

module.exports = mongoose.model('User', schema, "users");







