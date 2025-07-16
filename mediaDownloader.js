const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

function randomFilename(ext = '.mp4') {
  return `video-${Date.now()}${ext}`
}

async function downloadFile(url, filename) {
  const res = await axios({ url, responseType: 'stream' })
  const filepath = path.join(__dirname, filename)
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath)
    res.data.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
  return filepath
}

async function downloadTikTok(url) {
  try {
    const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`)
    if (!res.data?.data?.play) throw new Error('❌ Tidak bisa mengambil video TikTok.')
    const videoUrl = res.data.data.play
    const filename = randomFilename()
    return await downloadFile(videoUrl, filename)
  } catch (err) {
    throw new Error('❌ Gagal download TikTok.')
  }
}

async function downloadInstagram(url) {
  try {
    const res = await axios.post('https://snapinsta.app/action.php', new URLSearchParams({
      url: url,
      action: 'post'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      }
    })
    const $ = cheerio.load(res.data)
    const videoUrl = $('a.downloadBtn').attr('href')
    if (!videoUrl) throw new Error('❌ Tidak bisa ambil video dari Instagram.')
    const filename = randomFilename()
    return await downloadFile(videoUrl, filename)
  } catch (err) {
    throw new Error('❌ Gagal download IG Reels.')
  }
}

async function downloadTwitter(url) {
  try {
    const res = await axios.get(`https://twdown.net/download.php?URL=${encodeURIComponent(url)}`)
    const $ = cheerio.load(res.data)
    const videoUrl = $('a[href*=".mp4"]').first().attr('href')
    if (!videoUrl) throw new Error('❌ Tidak bisa ambil video dari Twitter.')
    const filename = randomFilename()
    return await downloadFile(videoUrl, filename)
  } catch {
    throw new Error('❌ Gagal download video Twitter.')
  }
}

module.exports = {
  downloadTikTok,
  downloadInstagram,
  downloadTwitter
}