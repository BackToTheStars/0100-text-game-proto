const Admin = require('../models/Admin');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { getError } = require('../../core/services/errors');

const login = async (req, res, next) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) {
      return next(getError('Invalid nickname/password!!!', 401));
    }

    const admin = await Admin.findOne({ nickname });

    if (!admin) {
      return next(getError('Invalid nickname/password!!!', 401));
    }

    // Проверка пароля с использованием argon2
    if (!(await argon2.verify(admin.password, password))) {
      return next(getError('Invalid nickname/password!!!', 401));
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
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
};