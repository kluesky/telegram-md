const { exec } = require('child_process')
const path = require('path')

exports.downloadYTMP3 = async (url) => {
  return new Promise((resolve, reject) => {
    const output = path.join(__dirname, `yt-audio-${Date.now()}.mp3`)
    const command = `yt-dlp -x --audio-format mp3 -o "${output}" "${url}"`

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('[YTMP3 ERROR]', stderr)
        return reject(new Error('❌ Gagal download audio.'))
      }
      resolve(output)
    })
  })
}