const jwt = require('jsonwebtoken');
const { getError } = require('../../core/services/errors');

const adminMiddleware = (req, res, next) => {
  try {
    // проверяем админский token
    const { authorization } = req.headers;
    let token;
    if (authorization && authorization.split(' ')[0] === 'Bearer') {
      token = authorization.split(' ')[1];
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.adminId = decoded.data.id;
      }
      next();
    });
  } catch (error) {
    next(error);
  }
};

const isAdmin = (req, res, next) => {
  if (!req.adminId) {
    return next(getError('Unauthorized', 403));
  }
  next();
};

module.exports = {
  adminMiddleware,
  isAdmin,
};
