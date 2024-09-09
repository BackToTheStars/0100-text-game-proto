const { default: axios } = require('axios');
const { STATIC_AUDIO_URL } = require('../../../config/url');
const { getError } = require('../../core/services/errors');
const Turn = require('../../game/models/Turn');
const { getToken } = require('../../game/services/game');
const { hashFunc } = require('../../game/services/security');

const list = async (req, res, next) => {
  try {
    const {
      skip = 0,
      limit = 100,
      gameId,
      searchText = '',
      contentType = '',
      sort = 'updatedAt',
      sortDir = 'desc',
    } = req.query;
    const criteria = {};
    if (gameId) {
      criteria.gameId = gameId;
    }
    if (contentType) {
      criteria.contentType = contentType;
    }
    if (searchText) {
      criteria.header = { $regex: searchText, $options: 'i' };
    }
    const items = await Turn.find(criteria)
      .skip(+skip)
      .limit(+limit)
      .sort({ [sort]: sortDir === 'asc' ? 1 : -1 });
    const count = await Turn.countDocuments(criteria);
    res.json({
      count,
      items,
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Turn.findById(id);
    res.json({
      item,
    });
  } catch (err) {
    next(err);
  }
};

const moveAudio = async (req, res, next) => {
  try {
    const { turnId, audioUrl } = req.body;
    const turn = await Turn.findById(turnId);
    if (
      !audioUrl ||
      turn.audioUrl !== audioUrl ||
      audioUrl.startsWith(STATIC_AUDIO_URL)
    ) {
      throw getError('Audio url mismatch', 400);
    }

    // получить static token
    const hash = hashFunc(turn.gameId);
    const tokenStaticServer = getToken(
      process.env.JWT_SECRET_STATIC,
      'download_and_save',
      new Date().getTime() + 5 * 60 * 1000,
      hash
    );

    // отправить запрос audios/download-and-save
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

    // обновить turn.audioUrl
    turn.audioUrl = resp.data.src;
    await turn.save();

    res.json({
      item: turn,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  moveAudio,
};
