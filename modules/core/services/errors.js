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

// mongoose ValidationError/CastError никто не ставит statusCode — они уходят
// в общий обработчик как есть, и их .message несёт путь до файла схемы и
// формулировку валидатора. Наружу отдаём только список неверных полей.
const describeInputError = (err) => {
  if (!err) {
    return null;
  }
  if (err.name === 'ValidationError' && err.errors) {
    const fields = Object.keys(err.errors);
    return fields.length
      ? `Проверьте поля: ${fields.join(', ')}`
      : 'Неверные данные запроса';
  }
  if (err.name === 'CastError') {
    return err.path
      ? `Неверное значение поля «${err.path}»`
      : 'Неверные данные запроса';
  }
  return null;
}

module.exports = {
  getError,
  describeInputError,
}