require('dotenv').config();
const get = require('async-get-file');
const path = require('path');
const uniqid = require('uniqid');
const axios = require('axios');
const FormData = require('form-data');
const { getToken } = require('../lib/game');
const fs = require('fs');

const Turn = require('../models/Turn');
const { STATIC_API_URL } = require('../config/url');

const tmpBasePath = path.join(__dirname, '../tmp/');

const downloadImage = async (fileUrl) => {
  const imageName = uniqid.time() + '.jpg';

  await get(fileUrl, {
    directory: tmpBasePath,
    filename: imageName,
  });
  return path.join(tmpBasePath, imageName);
};

const uploadImage = async (filePath, hash) => {
  const data = new FormData();
  data.append('file', fs.createReadStream(filePath));

  const tokenStaticServer = getToken(
    process.env.JWT_SECRET_STATIC,
    'upload',
    new Date().getTime() + 5 * 60 * 1000,
    hash
  );

  const config = {
    method: 'post',
    url: STATIC_API_URL + '/images/upload',
    headers: {
      Authorization: 'Bearer ' + tokenStaticServer,
      ...data.getHeaders(),
    },
    data: data,
  };

  const resp = await axios(config);
  return resp.data.src;
};

const createTurn = async ({ gameId, msg, imageUrl}) => {
  const lastTurn = await Turn.findOne({
    gameId,
    contentType: { $ne: 'zero-point' },
  }).sort({ createdAt: 'desc' });

  const {x = 0, y = 0} = lastTurn || {};
  const body = {
    gameId,
    width: 800,
    height: 600,
    contentType: 'picture',
    header: msg.forward_from_chat?.title || '',
    date: msg.forward_date ? msg.forward_date * 1000 : null,
    imageUrl: imageUrl || null,
    x: x + lastTurn.width + 50,
    y,
    dontShowHeader: true,
  };

  if (msg.forward_from_message_id) {
    body.sourceUrl = `https://t.me/${msg.forward_from_chat.username}/${msg.forward_from_message_id}`;
  }

  body.paragraph = [{ insert: msg.caption || msg.text || '' }];

  const newTurn = new Turn(body);
  await newTurn.save();
};

module.exports = {
  downloadImage,
  uploadImage,
  createTurn,
};
