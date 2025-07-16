const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

exports.downloadYT = async (url) => {
  return new Promise((resolve, reject) => {
    const output = path.join(__dirname, `yt-${Date.now()}.mp4`)
    const command = `yt-dlp -f mp4 -o "${output}" "${url}"`

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('[YT-DLP ERROR]', stderr)
        return reject(new Error('Gagal download video.'))
      }
      resolve(output)
    })
  })
}