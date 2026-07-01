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

const fetchTweetViaApi = async (tweetId) => {
  if (!process.env.X_BEARER_TOKEN) return null;
  try {
    const resp = await axios.get(
      'https://api.twitter.com/2/tweets/' + tweetId,
      {
        params: {
          expansions: 'author_id,attachments.media_keys',
          'tweet.fields': 'created_at,text,entities',
          'user.fields': 'name,username',
          'media.fields': 'url,type',
        },
        headers: {
          Authorization: 'Bearer ' + process.env.X_BEARER_TOKEN,
        },
        timeout: 5000,
      }
    );
    const { data, includes } = resp.data || {};
    if (!data) return null;

    const author = includes?.users?.[0];
    const photo = includes?.media?.find((m) => m.type === 'photo');

    return {
      text: data.text || null,
      authorName: author?.name || null,
      authorHandle: author?.username || null,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : null,
      imageUrl: photo?.url || null,
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
    authorName: null,
    authorHandle: null,
    createdAt: null,
    imageUrl: null,
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
