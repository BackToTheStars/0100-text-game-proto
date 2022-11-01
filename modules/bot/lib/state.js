const usersD = {};
const STEP_MESSAGE_FORWARD = 'STEP_MESSAGE_FORWARD'; // { step, msg }

const getUserInfo = (telegramUserId) => usersD[telegramUserId];

const setUserInfo = (telegramUserId, payload) => {
  usersD[telegramUserId] = payload;
};

module.exports = {
  getUserInfo,
  setUserInfo,
  STEP_MESSAGE_FORWARD,
};
