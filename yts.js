const yts = require('yt-search')

module.exports = async (query) => {
  return await yts(query)
}