const axios = require('axios')

async function getTodayAnimeSchedule() {
  try {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = dayMap[new Date().getDay()]

    const { data } = await axios.get('https://api.enime.moe/schedule')
    const filtered = data.filter(item => item.airingAt && new Date(item.airingAt * 1000).toLocaleDateString('en-US', { weekday: 'long' }) === today)

    if (!filtered.length) return `📭 Tidak ada anime tayang hari ${today}.`

    let teks = `📅 *Jadwal Anime Hari ${today}:*\n\n`
    filtered.forEach((anime, i) => {
      const time = new Date(anime.airingAt * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      teks += `${i + 1}. *${anime.title.romaji}* — ${time} WIB\n`
    })

    return teks
  } catch (err) {
    console.error('❌ Error:', err.message)
    return '❌ Gagal mengambil jadwal anime.'
  }
}

module.exports = {
  getTodayAnimeSchedule
}