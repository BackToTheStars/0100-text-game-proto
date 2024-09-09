const usersD = {};
const STEP_INIT = 'STEP_INIT';
const STEP_MESSAGE_FORWARD = 'STEP_MESSAGE_FORWARD'; // { step, msg }
const STEP_UPLOADING = 'STEP_UPLOADING';

const defaultUserFields = {
  step: STEP_INIT,
  msg: null,
};

const resetUserInfo = (telegramUserId) => {
  usersD[telegramUserId] = {
    userId: telegramUserId,
    ...defaultUserFields,
  };
};

const getUserInfo = (telegramUserId) => {
  if (!usersD[telegramUserId]) {
    resetUserInfo(telegramUserId);
  }
  return usersD[telegramUserId];
};

const updateUserInfo = (telegramUserId, payload) => {
  usersD[telegramUserId] = {
    ...usersD[telegramUserId],
    ...payload,
  };
};

module.exports = {
  resetUserInfo,
  getUserInfo,
  updateUserInfo,
  STEP_INIT,
  STEP_MESSAGE_FORWARD,
  STEP_UPLOADING,
};
