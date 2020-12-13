const getShortLink = (url) => {
  try {
    const shortLink = new URL(url).hostname;
    return shortLink
  } catch (err) {
    // console.log(url);
    // console.log(err);
    return url;
  }
}

module.exports = {
  getShortLink
}