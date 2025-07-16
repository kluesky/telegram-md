// file: airi-gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai')
const apiKey = process.env.GEMINI_KEY || 'GANTI APIKEYMU'
const genAI = new GoogleGenerativeAI(apiKey)

async function airiGeminiCommand(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' }) // TANPA "models/"
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    return text
  } catch (err) {
    console.error('❌ Gemini Error:', err)
    return '🌸 Airi Error: ' + (err.message || 'Terjadi kesalahan misterius~')
  }
}

module.exports = airiGeminiCommand