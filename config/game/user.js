// Права для работы внутри игры
// При изменении нужно дублировать на клиенте
const ROLE_GAME_VISITOR = 1;
const ROLE_GAME_PLAYER = 2; // остаётся вопрос, можно ли удалять чужие ходы (по идее, нельзя)
const ROLE_GAME_OWNER = 3; // может выдавать хэши ?

const RULE_VIEW = 1;
const RULE_TURNS_CRUD = 2; // включает CLASSES и LINES
// const RULE_CLASSES_CRUD = 3;
// const RULE_LINES_CRUD = 4;
const RULE_GAME_EDIT = 5; // добавление скриншота, переименования, отправки приглашений

const ROLES = {
  [ROLE_GAME_VISITOR]: {
    rules: [RULE_VIEW],
  },
  [ROLE_GAME_PLAYER]: {
    rules: [RULE_VIEW, RULE_TURNS_CRUD],
  },
  [ROLE_GAME_OWNER]: {
    rules: [RULE_VIEW, RULE_TURNS_CRUD, RULE_GAME_EDIT],
  },
};

module.exports = {
  ROLE_GAME_VISITOR,
  ROLE_GAME_PLAYER,
  ROLE_GAME_OWNER,
  
  RULE_VIEW,
  RULE_TURNS_CRUD,
  RULE_GAME_EDIT,
  ROLES,
}