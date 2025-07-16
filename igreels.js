const axios = require('axios')
const { JSDOM } = require('jsdom')

const ids = [2672947, 2756566, 2756564]

function toText(html = '') {
  const dom = new JSDOM(`<body>${html}</body>`)
  return dom.window.document.body.textContent.trim()
}

function extractImg(html = '') {
  const dom = new JSDOM(`<body>${html}</body>`)
  const img = dom.window.document.querySelector('img')
  return img?.src || null
}

async function fetchNews(sourceId) {
  try {
    const res = await axios.post(
      `https://api.gms.moontontech.com/api/gms/source/2669606/${sourceId}`,
      {
        pageIndex: 1,
        pageSize: 50,
        filters: [],
        sorts: [],
        object: [2667533]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-appid': '2669606',
          'x-actid': '2669607',
          'x-lang': 'id',
          origin: 'https://www.mobilelegends.com',
          referer: 'https://www.mobilelegends.com/'
        }
      }
    )

    return res.data?.data?.records?.map(record => {
      const d = record.data
      const body = d.body || ''
      const thumbnail = extractImg(body) || d.cover || d.image || null

      return {
        title: toText(d.title || 'No Title'),
        author: d.author?.name || 'Moonton',
        avatar: d.author?.avatar || null,
        thumbnail,
        date: new Date(d.start_time).toISOString().split('T')[0],
        caption: toText(body),
        link: `https://www.mobilelegends.com/news/articleldetail?newsid=${record.id}`
      }
    }) || []

  } catch (err) {
    console.error(`❌ Error source ${sourceId}:`, err.message)
    return []
  }
}

async function getNews() {
  const all = await Promise.all(ids.map(fetchNews))
  const merged = all.flat()
  return merged.sort((a, b) => new Date(b.date) - new Date(a.date))
}

module.exports = { getNews }