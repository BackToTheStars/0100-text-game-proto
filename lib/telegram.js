const get = require('async-get-file');
const path = require('path');
const uniqid = require('uniqid');
const axios = require('axios');
const FormData = require('form-data');
const { getToken } = require('../lib/game');
const fs = require('fs');

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

module.exports = {
  downloadImage,
  uploadImage,
};
