const fs = require('fs')
const AcrCloud = require('acrcloud')

const acr = new AcrCloud({
  host: 'identify-ap-southeast-1.acrcloud.com',
  access_key: '71f6c259d80225f2decfee897a3a71ec',
  access_secret: 'icAtNK60YoT218NUkcJWS86qEZooU0HIFCiKxllS'
})

async function detectLagu(filePath) {
  const buffer = fs.readFileSync(filePath)
  const result = await acr.identify(buffer)
  return JSON.parse(result)
}

module.exports = detectLagu