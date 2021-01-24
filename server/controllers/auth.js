const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const _sendError = (res, message = 'Invalid nickname/password!!!') => {
  return res.json({
    success: false,
    message,
  });
};

const login = async (req, res, next) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) {
    return _sendError(res);
  }

  const admin = await Admin.findOne({ nickname });

  if (!admin) {
    return _sendError(res);
  }

  if (!bcrypt.compareSync(password, admin.password)) {
    return _sendError(res);
  }

  const cookieExp = Date.now() + 7 * 24 * 3600000;

  const token = jwt.sign(
    {
      exp: Math.floor(cookieExp / 1000),
      data: { id: admin._id },
    },
    process.env.JWT_SECRET
  );

  res.json({
    success: true,
    expires: Math.floor(cookieExp / 1000),
    token,
  });
};

const adminMiddleware = (req, res, next) => {
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
};

module.exports = {
  login,
  adminMiddleware,
};
