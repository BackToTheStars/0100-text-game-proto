const axios = require('axios');

const XCOM_URL_REGEX =
  /^(https?:\/\/)?(www\.|mobile\.)?(x\.com|twitter\.com)\/([^/?#]+)\/status\/(\d+)/i;

const isXcomUrl = (url) => {
  if (!url) return false;
  return XCOM_URL_REGEX.test(url);
};

const parseTweetInfo = (url) => {
  if (!url) return null;
  const match = url.match(XCOM_URL_REGEX);
  if (!match) return null;
  return {
    handle: match[4],
    tweetId: match[5],
  };
};

const normalizeTweetUrl = (url) => {
  const info = parseTweetInfo(url);
  if (!info) return url;
  return `https://x.com/${info.handle}/status/${info.tweetId}`;
};

// Вариант «среднего» качества: медиана по битрейту среди mp4
// (при чётном числе вариантов — меньший из двух средних)
const pickVideoVariant = (variants = []) => {
  const mp4s = variants
    .filter((v) => v.content_type === 'video/mp4' && v.url)
    .sort((a, b) => (a.bit_rate || 0) - (b.bit_rate || 0));
  if (!mp4s.length) return null;
  return mp4s[Math.floor((mp4s.length - 1) / 2)];
};

const fetchTweetViaApi = async (tweetId) => {
  if (!process.env.X_BEARER_TOKEN) return null;
  try {
    const resp = await axios.get(
      'https://api.twitter.com/2/tweets/' + tweetId,
      {
        params: {
          expansions:
            'author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id',
          'tweet.fields': 'created_at,text,entities,note_tweet,referenced_tweets',
          'user.fields': 'name,username',
          'media.fields': 'url,preview_image_url,type,variants',
        },
        headers: {
          Authorization: 'Bearer ' + process.env.X_BEARER_TOKEN,
        },
        timeout: 5000,
      }
    );
    const { data, includes } = resp.data || {};
    if (!data) return null;

    // в includes.users попадают и авторы цитируемых твитов — ищем по author_id
    const users = includes?.users || [];
    const author = users.find((u) => u.id === data.author_id) || users[0];

    const media = includes?.media || [];
    const photo = media.find((m) => m.type === 'photo');
    const video = media.find(
      (m) => m.type === 'video' || m.type === 'animated_gif'
    );
    const videoVariant = video ? pickVideoVariant(video.variants) : null;

    // note_tweet — полный текст длинных постов (>280 символов);
    // индексы entities считаются относительно соответствующего текста
    const text = data.note_tweet?.text || data.text || null;
    const urls = data.note_tweet
      ? data.note_tweet.entities?.urls || []
      : data.entities?.urls || [];

    // цитируемый твит — один уровень
    let quoted = null;
    const quotedRef = data.referenced_tweets?.find((r) => r.type === 'quoted');
    const quotedTweet =
      quotedRef && includes?.tweets?.find((t) => t.id === quotedRef.id);
    if (quotedTweet) {
      const quotedAuthor = users.find((u) => u.id === quotedTweet.author_id);
      quoted = {
        text: quotedTweet.note_tweet?.text || quotedTweet.text || null,
        authorName: quotedAuthor?.name || null,
        authorHandle: quotedAuthor?.username || null,
        url: quotedAuthor?.username
          ? `https://x.com/${quotedAuthor.username}/status/${quotedTweet.id}`
          : null,
      };
    }

    return {
      text,
      urls,
      quoted,
      authorName: author?.name || null,
      authorHandle: author?.username || null,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : null,
      imageUrl: photo?.url || null,
      videoUrl: videoVariant?.url || null,
      videoPreviewUrl: video?.preview_image_url || null,
    };
  } catch (err) {
    console.error('[xcom] API fetch failed', err.response?.status || err.message);
    return null;
  }
};

const stripHtml = (html) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const fetchTweetViaOEmbed = async (tweetUrl) => {
  try {
    const resp = await axios.get('https://publish.twitter.com/oembed', {
      params: {
        url: tweetUrl,
        omit_script: true,
        dnt: true,
      },
      timeout: 5000,
    });
    const { html, author_name, author_url } = resp.data || {};
    if (!html) return null;

    const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const text = pMatch ? stripHtml(pMatch[1]) : null;

    let authorHandle = null;
    if (author_url) {
      const handleMatch = author_url.match(/(?:twitter|x)\.com\/([^/?#]+)/i);
      if (handleMatch) authorHandle = handleMatch[1];
    }

    return {
      text: text || null,
      authorName: author_name || null,
      authorHandle,
      createdAt: null,
      imageUrl: null,
    };
  } catch (err) {
    console.error('[xcom] oEmbed fetch failed', err.response?.status || err.message);
    return null;
  }
};

const fetchTweetData = async (url) => {
  const info = parseTweetInfo(url);
  const normalizedUrl = info ? `https://x.com/${info.handle}/status/${info.tweetId}` : url;
  const tweetId = info?.tweetId || null;

  const empty = {
    normalizedUrl,
    tweetId,
    text: null,
    urls: [],
    quoted: null,
    authorName: null,
    authorHandle: null,
    createdAt: null,
    imageUrl: null,
    videoUrl: null,
    videoPreviewUrl: null,
  };

  if (tweetId) {
    const apiData = await fetchTweetViaApi(tweetId);
    if (apiData) {
      return { ...empty, ...apiData, source: 'api' };
    }
  }

  const oembedData = await fetchTweetViaOEmbed(normalizedUrl);
  if (oembedData) {
    return { ...empty, ...oembedData, source: 'oembed' };
  }

  return { ...empty, source: 'fallback' };
};

module.exports = {
  isXcomUrl,
  parseTweetInfo,
  normalizeTweetUrl,
  fetchTweetData,
};
