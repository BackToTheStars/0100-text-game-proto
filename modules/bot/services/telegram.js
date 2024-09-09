require('dotenv').config();
const get = require('async-get-file');
const path = require('path');
const uniqid = require('uniqid');
const axios = require('axios');
const FormData = require('form-data');
const { getToken } = require('../../game/services/game');
const fs = require('fs');

const Turn = require('../../game/models/Turn');
const { STATIC_API_URL, STATIC_AUDIO_URL } = require('../../../config/url');

const tmpBasePath = path.join(__dirname, '../tmp/');

const getExt = (fileUrl) => {
  const ext = fileUrl.split('.').pop();
  return ext;
};

const downloadImage = async (fileUrl) => {
  const imageName = uniqid.time() + '.jpg';

  await get(fileUrl, {
    directory: tmpBasePath,
    filename: imageName,
  });
  return path.join(tmpBasePath, imageName);
};

const downloadAudio = async (fileUrl) => {
  const audioName = uniqid.time() + '.' + getExt(fileUrl);

  await get(fileUrl, {
    directory: tmpBasePath,
    filename: audioName,
  });
  return path.join(tmpBasePath, audioName);
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

const uploadAudio = async (filePath, hash) => {
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
    url: STATIC_AUDIO_URL + '/audios/upload',
    headers: {
      Authorization: 'Bearer ' + tokenStaticServer,
      ...data.getHeaders(),
    },
    data: data,
  };

  const resp = await axios(config);
  return resp.data.src;
};

const reverseDownloadAudio = async (audioUrl, hash) => {
  const tokenStaticServer = getToken(
    process.env.JWT_SECRET_STATIC,
    'download_and_save',
    new Date().getTime() + 5 * 60 * 1000,
    hash
  );

  const config = {
    method: 'post',
    url: STATIC_AUDIO_URL + '/audios/download-and-save',
    headers: {
      Authorization: 'Bearer ' + tokenStaticServer,
      'Content-Type': 'application/json',
    },
    data: {
      audioUrl,
    },
  };

  const resp = await axios(config);
  return resp.data.src;
}

const createTurn = async ({ gameId, msg, imageUrl }) => {
  const lastTurn = await Turn.findOne({
    gameId,
  }).sort({ createdAt: 'desc' });

  const { x = 0, y = 0, width = 0 } = lastTurn || {};
  const body = {
    gameId,
    width: 800,
    height: 600,
    contentType: 'picture',
    header: msg.forward_from_chat?.title || '',
    date: msg.forward_date ? msg.forward_date * 1000 : null,
    imageUrl: imageUrl || null,
    x: x + width + 50,
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

const createAudioTurn = async ({ gameId, msg, audioUrl }) => {
  const lastTurn = await Turn.findOne({
    gameId,
  }).sort({ createdAt: 'desc' });

  const { x = 0, y = 0, width = 0 } = lastTurn || {};

  const body = {
    gameId,
    width: 400,
    height: 50 + 28 + (msg?.caption ? 40 + 14 : 0), // audio + 2spaces + (text?paragraph + space)
    contentType: 'audio',
    header: msg.audio?.title || msg.audio?.file_name || '',
    date: msg.date * 1000,
    audioUrl,
    x: x + width + 50,
    y,
    dontShowHeader: true,
  };
  body.paragraph = msg?.caption ? [{ insert: msg?.caption }] : undefined;
  const newTurn = new Turn(body);
  await newTurn.save();

  return newTurn;
};

module.exports = {
  downloadImage,
  uploadImage,

  downloadAudio,
  uploadAudio,
  reverseDownloadAudio,

  createTurn,
  createAudioTurn,
};
