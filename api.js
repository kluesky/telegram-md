const axios = require('axios')

exports.getWeather = async (kota) => {
  try {
    const url = `https://wttr.in/${encodeURIComponent(kota)}?format=3`
    const { data } = await axios.get(url)
    return `🌤 ${data}`
  } catch (err) {
    return '❌ Gagal mengambil data cuaca.'
  }
}