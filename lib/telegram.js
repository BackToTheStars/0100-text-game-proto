require('dotenv').config();
const get = require('async-get-file');
const path = require('path');
const uniqid = require('uniqid');
const axios = require('axios');
const FormData = require('form-data');
const { getToken } = require('../lib/game');
const fs = require('fs');

const Turn = require('../models/Turn');

const tmpBasePath = path.join(__dirname, '../tmp/');
const STATIC_HOST = process.env.STATIC_HOST || `http://localhost:3003`;

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
    url: STATIC_HOST + '/images/upload',
    headers: {
      Authorization: 'Bearer ' + tokenStaticServer,
      ...data.getHeaders(),
    },
    data: data,
  };

  const resp = await axios(config);
  return resp.data.src;
};

const createTurn = async (data) => {
  const lastTurn = await Turn.findOne({
    gameId: data.gameId,
    contentType: { $ne: 'zero-point' },
  }).sort({ createdAt: 'desc' });

  const body = {
    gameId: data.gameId,
    width: 800,
    height: 600,
    contentType: 'picture',
    header: data.msg.forward_from_chat?.title,
    date: data.msg.forward_date * 1000,
    imageUrl: data.imagePath,
    x: lastTurn.x + lastTurn.width + 50,
    y: lastTurn.y + 0,
    dontShowHeader: true,
  };

  if (data.msg.forward_from_message_id) {
    body.sourceUrl = `https://t.me/${data.msg.forward_from_chat.username}/${data.msg.forward_from_message_id}`;
  }

  if (data.msg.photo !== undefined) {
    body.paragraph = [
      {
        insert: data.msg.caption,
      },
    ];
  } else {
    body.paragraph = [
      {
        insert: data.msg.text,
      },
    ];
  }

  const newTurn = new Turn(body);
  await newTurn.save();
};

module.exports = {
  downloadImage,
  uploadImage,
  createTurn,
};
