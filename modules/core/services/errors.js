// errorCode — машинный код отказа для клиента там, где он различает причины:
// текст отказа виден пользователю и меняется, код — нет.
const getError = (message, statusCode = 500, errorCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) {
    error.errorCode = errorCode;
  }
  return error;
}

module.exports = {
  getError
}