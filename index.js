require('dotenv').config()
const OpenAI = require('openai')
const FormData = require('form-data')
const AdmZip = require('adm-zip');
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY })
const { Telegraf, Markup, Input } = require('telegraf')
const fs = require('fs')
const airiGeminiCommand = require('./airi-gemini')
const axios = require('axios')
const ytdl = require('@distube/ytdl-core')
const yts = require('./yts')
const path = require('path')
const http = require('http');
const fetch = require('node-fetch')
const { getTodayAnimeSchedule } = require('./getAnimeSchedule')
const waifuStatsFile = './waifuStats.json'
const { downloadYT } = require('./downloader')
const cheerio = require('cheerio')
const { downloadYTMP3 } = require('./downloadermp3')
const { getWeather } = require('./api')
const { exec } = require('child_process')
const detectLagu = require('./detectsong')
const { getNews } = require( './igreels.js')
const waifuFile = './waifuDB.json'
const veilFile = './db/veil.json'
const veilUsersFile = './data/veil_users.json'
const OWNER_ID = 7537211155
const {
  downloadTikTok,
  downloadInstagram,
  downloadTwitter
} = require('./mediaDownloader')

function toSlug(str) { return str.toLowerCase() .replace(/[^a-z0-9]+/g, '-') .replace(/^-+|-+$/g, '') }

const fights = {}
function escapeMarkdownV2(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

let veilUsers = {}

if (!fs.existsSync(veilUsersFile)) {
  fs.writeFileSync(veilUsersFile, '{}')
  veilUsers = JSON.parse(fs.readFileSync(veilFile))
}

//gacha lah\\
if (!fs.existsSync(waifuFile)) fs.writeFileSync(waifuFile, '{}')
let waifuDB = JSON.parse(fs.readFileSync(waifuFile))

function generateRarity() {
  const rand = Math.random()
  if (rand < 0.5) return 'C'       // 50%
  if (rand < 0.75) return 'R'      // 25%
  if (rand < 0.9) return 'SR'      // 15%
  if (rand < 0.98) return 'SSR'    // 8%
  return 'SSSR'                    // 2%
}

function generateStats(rarity) {
  const base = {
    C:     { hp: [50, 80], atk: [5, 10], def: [2, 5] },
    R:     { hp: [80, 120], atk: [10, 20], def: [5, 10] },
    SR:    { hp: [120, 160], atk: [20, 30], def: [10, 15] },
    SSR:   { hp: [160, 200], atk: [30, 40], def: [15, 20] },
    SSSR:  { hp: [200, 250], atk: [40, 60], def: [20, 30] }
  }[rarity]

  return {
    hp: Math.floor(Math.random() * (base.hp[1] - base.hp[0] + 1)) + base.hp[0],
    atk: Math.floor(Math.random() * (base.atk[1] - base.atk[0] + 1)) + base.atk[0],
    def: Math.floor(Math.random() * (base.def[1] - base.def[0] + 1)) + base.def[0]
  }
}
//mainan
const dungeonSessions = {}

const slimeEnemies = [
  { name: 'Gobta', hp: 100, atk: 10, def: 4 },
  { name: 'Shion', hp: 120, atk: 15, def: 5 },
  { name: 'Benimaru', hp: 140, atk: 18, def: 6 },
  { name: 'Ranga', hp: 110, atk: 13, def: 4 },
  { name: 'Milim Nava', hp: 180, atk: 22, def: 8 }
]
// === Konfigurasi OpenAI ===
const npcSession = {}
const npcMode = {} // userId: true jika sedang aktif NPC

const users = fs.existsSync('./users.json') ? require('./users.json') : {}
const statsFile = './stats.json'
let stats = fs.existsSync(statsFile) ? JSON.parse(fs.readFileSync(statsFile)) : {}


async function askNPC(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    })
    return response.choices[0].message.content
  } catch (err) {
    console.error('❌ OpenAI Error:', err.message)
    return null
  }
}

let waifuStats = fs.existsSync(waifuStatsFile) ? JSON.parse(fs.readFileSync(waifuStatsFile)) : {}
function saveWaifuStats() {
  fs.writeFileSync(waifuStatsFile, JSON.stringify(waifuStats, null, 2))
}

function addStat(command) {
  stats[command] = (stats[command] || 0) + 1
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2))
}

const bot = new Telegraf(process.env.BOT_TOKEN)

// /start
bot.start(async (ctx) => {
  const text = `Konbanwa~ <b>${ctx.from.first_name || 'Senpai'}</b>! 🌙✨\n
Aku <b>Seiren</b>, bot imut siap menemani harimu~ 🎀\n
Ketik <b>/help</b> buat lihat fitur-fitur lucuku yaa~ 💌\n
\n
Sebagai sambutan, aku kirimin lagu spesial~ 🎧`;

  await ctx.reply(text, { parse_mode: 'HTML' });

  // Ganti dengan link MP3 kamu
  await ctx.replyWithAudio({
    url: 'https://files.catbox.moe/vgckjw.opus' // <--- ganti dengan URL asli
  }, {
    title: 'Welcome Song',
    performer: 'Seiren',
    caption: '🎵 Lagu sambutan dari Seiren~ 💖'
  });
});

// /help
bot.command('help', async (ctx) => {
  addStat('/help')
  const user = ctx.from.first_name || 'Kamu'

  /// Salam kawaii panjang dan imut
const greetings = [
  `Konbanwa, <b>${user}</b>-senpai~ 🌙\nAku sudah menunggumu sejak tadi loh~ Jangan lupa bawa cemilan ya, karena menu kali ini spesial~! 🍡✨`,
  `Yaa~ <b>${user}</b>-kun, Seiren di sini! (≧◡≦)♡\nAku sudah siap menemanimu dengan fitur-fitur super moe dan seru~ Mau mulai petualangan anime bareng Seiren? 💫`,
  `Halo halo~ <b>${user}</b>-chan~ 🐾\nMenu hari ini penuh keajaiban dan kejutan~ Jangan lupa senyum sebelum pilih fiturnya yaa~ 🌈✨`,
  `Nyaa~ <b>${user}</b>-nya datang~! 💖\nKamu tahu nggak? Hatiku meleleh tiap kamu pakai bot ini~ Ayo jelajahi fitur anime dan AI bareng Seiren~ ฅ^•ﻌ•^ฅ`,
  `Uwah! <b>${user}</b> muncul seperti protagonis anime! ✨\nApakah kamu siap memulai misi spesial bersama Seiren-chan? Yuk klik menunya, dan mari bersenang-senang~ 🎮💕`
]
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]  
  const menuText = `${randomGreeting}

<b>🪀 [ MENU UTAMA ]</b>
/cekdiscord &lt;url&gt; – Cek info server Discord  
/ping – Cek status server bot  
/feedback &lt;pesan&gt; – Kirim masukan ke owner  

<b>📥 [ DOWNLOADER ]</b>
/play &lt;judul&gt; – Cari dan putar lagu dari YouTube  
/ytmp3 &lt;url&gt; – Download MP3 dari YouTube  
/ytmp4 &lt;url&gt; – Download video dari YouTube  
/laguboomb &lt;tema&gt; – Buat lagu AI berdasarkan tema  
/tourl – Upload media dan dapatkan link  

<b>📊 [ STATISTIK ]</b>
/statistik – Statistik pengguna (owner only)  
/statistikfitur – Statistik fitur  

<b>🤖 [ AI INTELLIGENCE ]</b>
/airi &lt;teks&gt; – Ngobrol dengan Airi-chan  
/npc &lt;teks&gt; – Mode NPC RPG AI  
/nonpc – Nonaktifkan NPC  
/voice &lt;karakter&gt;|&lt;teks&gt; – Buat suara karakter  

<b>🎌 [ ANIME MENU ]</b>
/waifu – Random waifu  
/jadwalanime – Jadwal anime harian  
/anime &lt;judul&gt; – Download anime  
/rekomendasi – Rekomendasi anime  
/rekomood &lt;mood&gt; – Rekomendasi anime sesuai mood  

<b>🎮 [ GAME MENU ]</b>
/tebaksuara – Tebak suara karakter anime  
/triviapvp @user – PvP trivia anime  
/waifupvp – PvP waifu battle  
/slot – Mesin slot anime  
/adopsi – Adopsi pet anime  
/petku – Lihat pet kamu  
/kasihsayang – Tambah kasih sayang  
/lepas – Lepas pet  
/petboard – Ranking kasih sayang  

<b>🔧 [ OWNER TOOLS ]</b>
/cekid – Cek ID Telegram user  
/totalfitur – Hitung semua fitur  
/spylog – Lihat aktivitas terbaru  

━━━━━━━━━━━━━━━━━━  
💌 <b>Terima kasih telah menggunakan Seiren!</b>  
Bot ini masih dalam tahap pengembangan (開発中)  
Gunakan /feedback atau hubungi @me_kyuu  
<i>Yoroshiku onegaishimasu~</i> 🤝💫`
  await ctx.replyWithHTML(menuText)
  const voiceList = [
    'https://files.catbox.moe/tw6y83.mp3',
    'https://files.catbox.moe/ixuaj4.opus',
    'https://files.catbox.moe/394dut.opus',
    'https://files.catbox.moe/7d8yek.opus'
  ]
  const randomVoice = voiceList[Math.floor(Math.random() * voiceList.length)]
  await ctx.replyWithVoice(
    { url: randomVoice },
    { caption: '🎙️ Seiren mengirimkan salam suara random~' }
  )
})


////ML\\
bot.command('mlnews', async (ctx) => {
  const news = await getNews()
  if (!news.length) return ctx.reply('⚠️ Gagal mengambil berita MLBB.')
  const article = news[0] // ambil berita terbaru
  await ctx.replyWithPhoto(
    { url: article.thumbnail || 'https://files.catbox.moe/u3cvo9.jpg' },
    {
      caption:
        `📰 <b>${article.title}</b>\n\n` +
        `🧑‍💼 <i>${article.author}</i>\n📅 ${article.date}\n\n` +
        `${article.caption.slice(0, 300)}...\n\n` +
        `📎 Klik tombol di bawah untuk baca selengkapnya.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🌐 Baca di Web MLBB',
              url: article.link
            }
          ]
        ]
      }
    }
  )
})
// === Downloader YT ===
bot.command('ply', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ')
  if (!query) return ctx.reply('⚠️ Masukkan judul lagu setelah /play')

  try {
    await ctx.reply('🔍 Mencari lagu...')

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    // Cari ID video dari script ytInitialData
    const initialData = data.match(/var ytInitialData = (.*?);\s*<\/script>/)
    if (!initialData) return ctx.reply('❌ Gagal parsing halaman YouTube.')

    const json = JSON.parse(initialData[1])
    const contents = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents

    const videoRenderer = contents
      .flatMap(c => c.itemSectionRenderer?.contents || [])
      .find(item => item.videoRenderer)

    const videoId = videoRenderer?.videoRenderer?.videoId
    const title = videoRenderer?.videoRenderer?.title?.runs?.[0]?.text

    if (!videoId) return ctx.reply('❌ Lagu tidak ditemukan.')

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const outputPath = path.join(__dirname, 'audio.webm')

    const stream = ytdl(videoUrl, { filter: 'audioonly' })
    const writeStream = fs.createWriteStream(outputPath)

    stream.pipe(writeStream)

    stream.on('end', async () => {
      await ctx.reply(`🎵 *${title}*\n🔗 ${videoUrl}`, { parse_mode: 'Markdown' })
      await ctx.replyWithAudio({ source: outputPath }, { title })
      fs.unlinkSync(outputPath)
    })

  } catch (err) {
    console.error('❌ Error:', err)
    ctx.reply('❌ Terjadi kesalahan saat memproses lagu.')
  }
})
bot.command('play', async (ctx) => {
  addStat('/play')
  const query = ctx.message.text.split(' ').slice(1).join(' ')
  if (!query) {
    return ctx.reply('⚠️ Masukkan judul lagu setelah /play', {
      reply_to_message_id: ctx.message.message_id
    })
  }
  try {
    await ctx.reply('📥 Sedang mencari lagu...', {
      reply_to_message_id: ctx.message.message_id
    })
    const res = await yts(query)
    const video = res.all.find(v => v.type === 'video')
    if (!video) {
      return ctx.reply('❌ Lagu tidak ditemukan.', {
        reply_to_message_id: ctx.message.message_id
      })
    }
    const thumb = video.thumbnail // Deteksi thumbnail
    await ctx.replyWithPhoto({ url: thumb }, {
      caption: `🎵 *${video.title}*\n📺 Channel: ${video.author.name}\n⏱ Duration: ${video.timestamp}`,
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    })
    const file = await downloadYTMP3(video.url)
    await ctx.replyWithAudio(
      { source: file },
      {
        title: video.title,
        performer: video.author.name,
        reply_to_message_id: ctx.message.message_id,
        thumb: { url: thumb } // Tambahkan thumbnail ke audio jika didukung
      }
    )
    fs.unlinkSync(file)
  } catch (err) {
    console.error(err)
    ctx.reply('❌ Gagal memproses lagu.', {
      reply_to_message_id: ctx.message.message_id
    })
  }
})

bot.command('backup', async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== OWNER_ID) {
    return ctx.reply('⚠️ Perintah ini hanya bisa digunakan oleh owner bot!');
  }
  try {
    const zip = new AdmZip();
    const folderPath = '.'; // direktori utama bot
    const backupName = `backup-${new Date().toISOString().split('T')[0]}.zip`;
    function addFolderToZip(folder, zipPath = '') {
      const files = fs.readdirSync(folder);
      for (const file of files) {
        // Skip folder berat/tidak perlu
        if (file === 'node_modules' || file === '.git' || file === 'backup.zip') continue;
        const fullPath = path.join(folder, file);
        const relativePath = path.join(zipPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          addFolderToZip(fullPath, relativePath);
        } else {
          zip.addFile(relativePath, fs.readFileSync(fullPath));
        }
      }
    }
    addFolderToZip(folderPath);
    const buffer = zip.toBuffer();
    await ctx.replyWithDocument({ source: buffer, filename: backupName });
    console.log(`✅ Backup dikirim ke owner (${userId})`);
  } catch (err) {
    console.error(err);
    ctx.reply('❌ Terjadi kesalahan saat membuat backup.');
  }
});

bot.command('ytmp4', async (ctx) => {
  addStat('/ytmp4')
  const text = ctx.message.text.split(' ')[1]
  if (!text) return ctx.reply('⚠️ Kirim link YouTube setelah perintah.')
  try {
    const file = await downloadYT(text)
    await ctx.replyWithVideo({ source: file })
    fs.unlinkSync(file)
  } catch (e) {
    ctx.reply('❌ Gagal download video.')
  }
})

bot.command('ytmp3', async (ctx) => {
  addStat('/ytmp3')
  const link = ctx.message.text.split(' ')[1]
  if (!link) return ctx.reply('⚠️ Masukkan link YouTube setelah perintah.')
  try {
    const file = await downloadYTMP3(link)
    await ctx.replyWithAudio({ source: file })
    fs.unlinkSync(file)
  } catch (e) {
    ctx.reply(e.message || '❌ Gagal download audio.')
  }
})

// Statistik
bot.command('statistik', (ctx) => {
  if (ctx.from.id !== OWNER_ID) {
    return ctx.reply('❌ Akses ditolak: hanya owner yang bisa menggunakan perintah ini.')
  }

  const total = Object.keys(users).length
  let list = ''
  Object.entries(users).forEach(([id, info], i) => {
    list += `${i + 1}. ${info.username} (ID: ${id})\n`
  })

  const teks = `📊 Statistik Pengguna Bot:\n\n👥 Total: ${total} pengguna\n\n${list}`
  ctx.reply(teks)
})

bot.command('statistikfitur', (ctx) => {
  if (Object.keys(stats).length === 0) return ctx.reply('📊 Belum ada data penggunaan.')
  let list = '📈 Statistik Penggunaan Fitur:\n\n'
  for (const [cmd, count] of Object.entries(stats)) {
    list += `• ${cmd}: ${count} kali\n`
  }
  ctx.reply(list)
})
//Laporan\\
bot.command('feedback', async (ctx) => {
  const feedbackText = ctx.message.text.split(' ').slice(1).join(' ')
  const from = ctx.from

  if (!feedbackText) {
    return ctx.reply('❗ Contoh penggunaan:\n`/feedback Botnya sangat membantu!`\n\nKirimkan masukan atau laporan setelah perintah.', {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    })
  }
  // Kirim ke user (owner)
  const laporan = `📬 *Feedback Baru Masuk!*\n\n👤 Dari: [${from.first_name}](tg://user?id=${from.id})\n🆔 ID: \`${from.id}\`\n\n📩 Pesan:\n${feedbackText}`

  try {
    await bot.telegram.sendMessage(OWNER_ID, laporan, { parse_mode: 'Markdown' })
    ctx.reply('✅ Masukan kamu telah terkirim ke owner. Terima kasih!', {
      reply_to_message_id: ctx.message.message_id
    })
  } catch (e) {
    console.error('❌ Gagal kirim feedback:', e.message)
    ctx.reply('⚠️ Gagal mengirim feedback. Coba lagi nanti.')
  }
})
bot.command('konachan', async (ctx) => {
  const loading = await ctx.reply('🍬 Mencari gambar waifu...');

  try {
    const res = await axios.get('https://waifu.pics/api/sfw/waifu');
    const imageUrl = res.data.url;

    if (!/^https?:\/\//i.test(imageUrl)) throw new Error('URL tidak valid');

    const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageRes.data);

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: '✨ <b>Gambar waifu berhasil ditemukan!</b>',
      parse_mode: 'HTML'
    });

  } catch (err) {
    console.error('❌ Error ambil gambar konachan:', err.message);
    await ctx.reply('❌ Gagal mengambil gambar waifu. Coba lagi nanti.');
  } finally {
    await ctx.deleteMessage(loading.message_id).catch(() => {});
  }
});
const uploader = async (buffer) => {
  const form = new FormData();
  form.append("fileToUpload", buffer, "image.jpg");
  form.append("reqtype", "fileupload");

  const res = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: form.getHeaders()
  });

  const url = res.data;
  return url.startsWith("http") ? url : null;
};

// Command handler Telegraf: /removebg
bot.command("removebg", async (ctx) => {
  const replied = ctx.message.reply_to_message;
  if (!replied || !replied.photo) {
    return ctx.reply("🖼️ Kirim atau balas foto dengan caption /removebg");
  }

  try {
    await ctx.reply("⏳ Sedang memproses gambar...");

    // Ambil photo resolusi tertinggi
    const fileId = replied.photo[replied.photo.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const res = await axios.get(fileLink.href, { responseType: "arraybuffer" });
    const buffer = Buffer.from(res.data);

    // Upload ke Catbox
    const imageUrl = await uploader(buffer);
    if (!imageUrl) throw new Error("❌ Gagal upload gambar");

    // Kirim ke API removebg
    const api = `https://api.nekorinn.my.id/tools/removebg?imageUrl=${encodeURIComponent(imageUrl)}`;
    const result = await axios.get(api);
    if (!result.data.status || !result.data.result) throw new Error("❌ API gagal memproses gambar");

    // Kirim hasil
    await ctx.replyWithPhoto({ url: result.data.result }, {
      caption: "✨ Background berhasil dihapus!"
    });

  } catch (err) {
    console.error("Error:", err.message);
    ctx.reply("❌ Terjadi kesalahan: " + err.message);
  }
});
bot.command('pixpic', async (ctx) => {
  try {
    const replyMsg = ctx.message.reply_to_message;

    if (!replyMsg || !replyMsg.photo) {
      return ctx.reply('📸 *Balas gambar dengan perintah /pixpic untuk memprosesnya.*');
    }

    await ctx.reply('⏳ Mengunggah dan memproses gambar...');

    // 1. Ambil file_id gambar terbesar
    const photo = replyMsg.photo[replyMsg.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);

    // 2. Download gambar dari Telegram
    const res = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const imageBuffer = res.data;

    // 3. Upload ke catbox.moe
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', imageBuffer, {
      filename: `pix_${Date.now()}.jpg`,
      contentType: 'image/jpeg'
    });

    const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });

    const imageUrl = uploadRes.data;
    if (!imageUrl.startsWith('http')) throw new Error('❌ Gagal upload ke Catbox');

    // 4. Kirim ke API upscale
    const upscaleRes = await axios.get(`https://api.nekorinn.my.id/tools/pxpic-upscale?imageUrl=${encodeURIComponent(imageUrl)}`);
    const json = upscaleRes.data;

    if (!json.status || !json.result) throw new Error('❌ Gagal memproses gambar.');

    // 5. Kirim hasil upscale
    await ctx.replyWithPhoto({ url: json.result }, { caption: '🔍 *Sukses! Gambar telah di-upscale jadi HD.*' });

  } catch (e) {
    console.error('❌ Error /pixpic:', e.message);
    ctx.reply(typeof e === 'string' ? e : '❌ *Terjadi kesalahan saat memproses gambar.*');
  }
});
bot.command('liburnasional', async (ctx) => {
  try {
    await ctx.reply('📆 Mengambil info hari libur...');

    const res = await axios.get('https://api.siputzx.my.id/api/info/liburnasional');
    const json = res.data;

    if (!json.status || !json.data) throw new Error('Gagal mengambil data dari server.');

    const { hari_ini, mendatang } = json.data;

    const hariIniText = hari_ini?.events?.length
      ? hari_ini.events.map(e => `• <b>${e}</b>`).join('\n')
      : '_Tidak ada event hari ini._';

    const nasional = mendatang?.event_nasional?.slice(0, 3).map(e =>
      `📌 <b>${e.event}</b>\n✧ ${e.date} — <i>${e.daysUntil} hari lagi</i>`
    ).join('\n') || '_Tidak ada event nasional mendatang._';

    const libur = mendatang?.hari_libur?.slice(0, 3).map(e =>
      `🎉 <b>${e.event}</b>\n✧ ${e.date} — <i>${e.daysUntil} hari lagi</i>`
    ).join('\n') || '_Tidak ada hari libur mendatang._';

    const caption = `
📆 <b>Info Hari Ini</b>
📅 <b>Tanggal:</b> ${hari_ini?.tanggal}
${hariIniText}

🇮🇩 <b>Event Nasional Mendatang:</b>
${nasional}

🕌 <b>Hari Libur Nasional Mendatang:</b>
${libur}
`.trim();

    await ctx.replyWithPhoto(
      {
        url: 'https://files.catbox.moe/sb5vz7.jpg' // Ganti dengan banner event libur nasional
      },
      {
        caption,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Lihat Semua Libur Nasional', url: 'https://www.hari-libur.com/' }]
          ]
        }
      }
    );

  } catch (e) {
    console.error('❌ liburnasional:', e.message);
    await ctx.reply('⚠️ Gagal mengambil informasi hari libur. Silakan coba lagi nanti.');
  }
});
bot.command('loli', async (ctx) => {
  try {
    await ctx.reply('⏳ Mengambil gambar loli, tunggu ya...');

    const res = await axios.get('https://api.nekorinn.my.id/random/loli');
    const imageUrl = res.data?.url || res.data;

    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('URL gambar tidak valid');
    }

    await ctx.replyWithPhoto({ url: imageUrl }, {
      caption: '🍬 <b>Nih lolinya~</b>',
      parse_mode: 'HTML'
    });
  } catch (e) {
    console.error('❌ Error /loli:', e.message);
    await ctx.reply('❌ Gagal mengambil gambar, coba lagi nanti ya kakak~');
  }
});
///stalker\\\
// Tambahkan di index.js kamu langsung // Free Fire Stalker via UID
bot.command('igstalk', async (ctx) => {
  try {
    const args = ctx.message.text.split(' ').slice(1);
    if (!args[0]) {
      return ctx.reply('📌 Masukkan username Instagram!\n\nContoh:\n/igstalk windahbasudara');
    }

    const username = args[0].toLowerCase();
    const api = `https://zenzxz.dpdns.org/stalker/instagram?username=${username}`;
    const res = await axios.get(api);
    const json = res.data;

    if (!json.status || !json.result) {
      return ctx.reply('❌ Akun tidak ditemukan atau terjadi kesalahan saat mengambil data.');
    }

    const {
      avatar,
      full_name,
      followers,
      following,
      posts,
      bio,
      is_verified,
      is_private,
      external_url
    } = json.result;

    const verif = is_verified ? '✅ Terverifikasi' : '❌ Tidak Terverifikasi';
    const priv = is_private ? '🔒 Akun Privat' : '🌐 Akun Publik';

    const caption = `
🪷 <b>Instagram Stalker</b>

🪪 <b>Nama:</b> ${full_name}
🎐 <b>Username:</b> @${username}
📌 <b>Bio:</b> ${bio || '-'}
📷 <b>Postingan:</b> ${posts}
👥 <b>Followers:</b> ${followers}
🔖 <b>Following:</b> ${following}
🌟 <b>Status:</b> ${verif}
🔐 <b>Privasi:</b> ${priv}
${external_url ? `🔗 <b>Link:</b> <a href="${external_url}">${external_url}</a>` : ''}
`.trim();

    await ctx.replyWithPhoto({ url: avatar }, {
      caption,
      parse_mode: 'HTML'
    });

  } catch (e) {
    console.error('❌ Error igstalk:', e.message);
    await ctx.reply('❌ Terjadi kesalahan saat mengambil data Instagram.');
  }
});
bot.command("growgarden", async (ctx) => {
  const message = ctx.message;
  const userId = message.from.id;
  const chatId = message.chat.id;

  try {
    await ctx.reply("🌱 Mengambil data stok Grow a Garden...");
    
    const res = await axios.get("https://zenzxz.dpdns.org/info/growagardenstock", {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY' // Ganti dengan apikey dari zenzxz
  }
});
    const json = res.data;

    if (!json.status || !json.data?.data) {
      throw new Error("❌ Gagal mengambil data stok dari server.");
    }

    const { seeds, gear, eggs, cosmetics, honey } = json.data.data;

    const formatList = (arr, title) => {
      if (!arr || arr.length === 0) return `• _Tidak ada ${title.toLowerCase()} tersedia._`;
      return arr.map(v => `• ${v.name} (${v.quantity}x)`).join("\n");
    };

    const text = `
🌿 *Grow A Garden Stock*

🧺 *Benih:*
${formatList(seeds, 'Benih')}

🛠️ *Peralatan:*
${formatList(gear, 'Peralatan')}

🥚 *Telur:*
${formatList(eggs, 'Telur')}

🎀 *Kostum / Dekorasi:*
${formatList(cosmetics, 'Kostum')}

🍯 *Item Event:*
${formatList(honey, 'Item Event')}
    `.trim();

    await ctx.replyWithPhoto("https://files.cloudkuimages.guru/images/Sr8O15FT.jpg", {
      caption: text,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌱 Website Update Real-time", url: "https://zenzxz.dpdns.org/info/growagardenstock" }]
        ]
      }
    });

  } catch (e) {
    console.error("❌ Error growgarden:", e.message);
    await ctx.reply("❌ Terjadi kesalahan saat mengambil data Grow a Garden.");
  }
});
bot.command('stalkroblox', async (ctx) => {
  const username = ctx.message.text.split(' ')[1];
  if (!username) return ctx.reply('📌 Contoh: /stalkroblox StresmenOri');

  const statusMsg = await ctx.reply('⏳ Mengambil data dari Roblox...');

  try {
    const res = await axios.get(`https://zenzxz.dpdns.org/stalker/roblox?username=${encodeURIComponent(username)}`);
    const json = res.data;

    if (!json.status || !json.success) {
      return ctx.reply('❌ Data tidak ditemukan atau username tidak valid!');
    }

    const a = json.data.account;
    const p = json.data.presence;
    const s = json.data.stats;
    const badges = json.data.badges || [];
    const friends = json.data.friendList || [];

    let teks = `🎮 <b>Roblox Stalker</b>\n\n`;
    teks += `👤 <b>Username:</b> ${a.username}\n`;
    teks += `📝 <b>Display Name:</b> ${a.displayName}\n`;
    teks += `📆 <b>Akun Dibuat:</b> ${new Date(a.created).toLocaleDateString()}\n`;
    teks += `🛡️ <b>Verifikasi:</b> ${a.hasVerifiedBadge ? '✅ Terverifikasi' : '❌ Tidak'}\n`;
    teks += `🔒 <b>Banned:</b> ${a.isBanned ? '✅ Ya' : '❌ Tidak'}\n\n`;

    teks += `🕹️ <b>Status Online:</b> ${p.isOnline ? '🟢 Online' : '🔴 Offline'}\n`;
    teks += `🎮 <b>Game Terakhir:</b> ${p.recentGame || '-'}\n\n`;

    teks += `👥 <b>Teman:</b> ${s.friendCount}\n`;
    teks += `👣 <b>Follower:</b> ${s.followers}\n`;
    teks += `➡️ <b>Following:</b> ${s.following}\n\n`;

    if (badges.length) {
      teks += `🏅 <b>Badge Terkait:</b>\n`;
      for (let i = 0; i < Math.min(5, badges.length); i++) {
        teks += `• ${badges[i].name} — ${badges[i].description || 'Tanpa deskripsi'}\n`;
      }
      teks += `\n`;
    }

    if (friends.length) {
      teks += `👬 <b>Teman (Terbaru):</b>\n`;
      for (let i = 0; i < Math.min(3, friends.length); i++) {
        teks += `• ${friends[i].displayName} (@${friends[i].name})\n`;
      }
    }

    try {
      const resImg = await fetch(a.profilePicture);
      const buffer = await resImg.buffer();

      await ctx.replyWithPhoto({ source: buffer }, {
        caption: teks,
        parse_mode: 'HTML'
      });
    } catch (imgErr) {
      console.error('⚠️ Gagal kirim gambar:', imgErr.message);
      await ctx.reply(teks, { parse_mode: 'HTML' });
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
    await ctx.reply('❌ Gagal mengambil data Roblox.');
  } finally {
    await ctx.deleteMessage(statusMsg.message_id).catch(() => {});
  }
});
///Hentai Ocean Veil 
bot.command('veil', async (ctx) => {
  const userId = ctx.from.id.toString()
  const username = ctx.from.username || ctx.from.first_name
  let veilUsers = JSON.parse(fs.readFileSync(veilUsersFile))

  // Kalau belum disetujui owner
  if (!veilUsers[userId]) {
    // Kirim ke user
    await ctx.reply(
      `❌ Fitur ini hanya untuk pengguna berumur 18+\n\nMohon izin akses ke owner: @me_kyuu`
    )

    // Kirim ke owner
    if (ctx.from.id !== OWNER_ID) {
      await ctx.telegram.sendMessage(OWNER_ID,
        `🔞 <b>Permintaan akses fitur OceanVeil</b>\n👤 <a href="tg://user?id=${userId}">${username}</a>\n\nKlik tombol untuk memberikan akses:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Izinkan Akses /veil', callback_data: `konfirmasi_veil_${userId}` }]
            ]
          }
        }
      )
    }

    return
  }

  // Jika sudah dapat izin
  const query = ctx.message.text.split(' ').slice(1).join(' ')
  if (!query) return ctx.reply('❗ Contoh: /veil Chuhai Lips')

  const url = `https://oceanveil.net/lp/search/${encodeURIComponent(query)}`
  await ctx.replyWithPhoto(
    { url: 'https://files.catbox.moe/pwcsj7.jpg' },
    {
      caption: `🌊 <b>Hasil pencarian:</b> <i>${query}</i>\n\n📌 Anda <b>wajib login</b> terlebih dahulu untuk menonton anime di website ini.\nKarena... ini sangat <b>Yabaiii~</b> 💦`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬 Tonton di OceanVeil', url }]
        ]
      }
    }
  )
})

// Callback tombol owner
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data
  const fromId = ctx.from.id

  if (data.startsWith('konfirmasi_veil_')) {
    if (fromId !== OWNER_ID) {
      return ctx.answerCbQuery('❌ Kamu bukan owner!')
    }

    const userId = data.split('konfirmasi_veil_')[1]
    let veilUsers = JSON.parse(fs.readFileSync(veilUsersFile))
    veilUsers[userId] = true
    fs.writeFileSync(veilUsersFile, JSON.stringify(veilUsers, null, 2))

    await ctx.answerCbQuery('✅ Akses diberikan.')
    await ctx.editMessageText('✅ Akses berhasil diberikan.')

    await ctx.telegram.sendMessage(userId, '🎉 Akses ke /veil telah diberikan oleh owner. Kamu sekarang bisa menggunakannya bebas~')
  }
})



//RPG\\
bot.command('datingwaifu', async (ctx) => {
  const userId = ctx.from.id.toString()
  const name = ctx.message.text.split(' ').slice(1).join(' ')
  if (!name) return ctx.reply('❗ Contoh: /datingwaifu Rem')

  if (!fs.existsSync('waifuDating.json')) fs.writeFileSync('waifuDating.json', '{}')
  const data = JSON.parse(fs.readFileSync('waifuDating.json'))

  data[userId] = {
    name,
    love: 10,
    intimacy: 10,
    lastGift: null
  }

  fs.writeFileSync('waifuDating.json', JSON.stringify(data, null, 2))

  await ctx.reply(`💖 Kamu sekarang pacaran dengan *${name}*! Jaga hatinya baik-baik ya~`, { parse_mode: 'Markdown' })
})
bot.command('talkwaifu', async (ctx) => {
  const userId = ctx.from.id.toString()
  if (!fs.existsSync('waifuDating.json')) return ctx.reply('❗ Kamu belum punya waifu pacar.')

  const data = JSON.parse(fs.readFileSync('waifuDating.json'))
  const waifu = data[userId]
  if (!waifu) return ctx.reply('❗ Kamu belum memulai hubungan! Ketik /datingwaifu <nama>')

  // Naikkan intimacy dan update mood random
  waifu.intimacy += Math.floor(Math.random() * 5) + 1
  waifu.love += 1

  const moods = ['senang', 'malu', 'marah', 'normal']
  const mood = moods[Math.floor(Math.random() * moods.length)]
  waifu.mood = mood
  fs.writeFileSync('waifuDating.json', JSON.stringify(data, null, 2))

  // Voice per mood
  const voiceByMood = {
    senang: [
      'https://files.catbox.moe/7d8yek.opus',
      'https://files.catbox.moe/tw6y83.mp3'
    ],
    malu: [
      'https://files.catbox.moe/ixuaj4.opus'
    ],
    marah: [
      'https://files.catbox.moe/hmvzj9.opus'
    ],
    normal: [
      'https://files.catbox.moe/394dut.opus'
    ]
  }

  // Teks per mood
  const msgByMood = {
    senang: [
      `Yatta~! Kamu ajak aku ngobrol lagi >///<`,
      `Aku jadi senang banget~! Mau dipeluk 💞`
    ],
    malu: [
      `H-hentikan... aku jadi malu... 😳`,
      `Jangan lihat aku seperti itu... baka~`
    ],
    marah: [
      `Grr! Kamu lupa janji kita ya?! 😠`,
      `Aku ngambek... jangan deket-deket dulu!`
    ],
    normal: [
      `Ayo cerita! Aku suka dengerin kamu~`,
      `Hari ini... kamu mikirin aku nggak?~`
    ]
  }

  const voice = voiceByMood[mood][Math.floor(Math.random() * voiceByMood[mood].length)]
  const message = msgByMood[mood][Math.floor(Math.random() * msgByMood[mood].length)]

  // Kirim teks + suara
  await ctx.replyWithMarkdown(`💬 *${waifu.name}* sedang dalam mood *${mood}*.\n\n_${message}_\n\n❤️ Intimacy: *${waifu.intimacy}*`)

  await ctx.replyWithVoice(
    { url: voice },
    { caption: `🎙️ Suara waifu ${waifu.name} (${mood})~` }
  )
})
bot.command('giftwaifu', async (ctx) => {
  const userId = ctx.from.id.toString()
  if (!fs.existsSync('waifuDating.json')) return ctx.reply('❗ Tidak ada data.')

  const data = JSON.parse(fs.readFileSync('waifuDating.json'))
  const waifu = data[userId]
  if (!waifu) return ctx.reply('❗ Kamu belum punya waifu! /datingwaifu dulu')

  const now = new Date().toISOString().split('T')[0]
  if (waifu.lastGift === now) return ctx.reply('❌ Kamu sudah memberi hadiah hari ini!')

  waifu.lastGift = now
  waifu.love += 5
  fs.writeFileSync('waifuDating.json', JSON.stringify(data, null, 2))

  await ctx.reply(`🎁 Kamu memberi hadiah ke ${waifu.name}!\n❤️ Love +5 (Total: ${waifu.love})`)
})
bot.command('statuswaifu', async (ctx) => {
  const userId = ctx.from.id.toString()
  if (!fs.existsSync('waifuDating.json')) return ctx.reply('❗ Tidak ada data.')

  const data = JSON.parse(fs.readFileSync('waifuDating.json'))
  const waifu = data[userId]
  if (!waifu) return ctx.reply('❗ Kamu belum pacaran dengan waifu!')

  await ctx.replyWithMarkdown(`🎀 *Status Hubungan*\n• Nama Waifu: *${waifu.name}*\n• ❤️ Love: *${waifu.love}*\n• 💬 Intimacy: *${waifu.intimacy}*`)
})
bot.command('waifuku', async (ctx) => {
  const userId = ctx.from.id.toString()
  const waifus = waifuDB[userId]

  if (!waifus || waifus.length === 0) return ctx.reply('💔 Kamu belum punya waifu. Coba summon dengan /summon10')

  let text = `🎀 <b>Koleksi Waifu-mu</b>\n\n`
  for (let i = 0; i < waifus.length; i++) {
    const w = waifus[i]
    text += `#${i + 1} – <b>${w.name}</b> [${w.rarity}]\n🧬 HP: ${w.hp} | ATK: ${w.atk} | DEF: ${w.def}\n\n`
  }

  await ctx.replyWithHTML(text)
})
bot.command('waifubattle', async (ctx) => {
  const userId = ctx.from.id.toString()
  const opponent = ctx.message.reply_to_message?.from
  if (!opponent) return ctx.reply('❗ Balas pesan user yang ingin kamu tantang.')

  const oppId = opponent.id.toString()
  const player1 = waifuDB[userId]?.[Math.floor(Math.random() * waifuDB[userId].length)]
  const player2 = waifuDB[oppId]?.[Math.floor(Math.random() * waifuDB[oppId].length)]

  if (!player1 || !player2) return ctx.reply('❌ Salah satu dari kalian tidak memiliki waifu.')

  let log = `⚔️ <b>Pertarungan Waifu</b>\n`
  log += `👸 <b>${player1.name}</b> [${player1.rarity}] vs <b>${player2.name}</b> [${player2.rarity}]\n\n`

  let p1 = { ...player1 }
  let p2 = { ...player2 }

  while (p1.hp > 0 && p2.hp > 0) {
    p2.hp -= Math.max(0, p1.atk - p2.def)
    if (p2.hp <= 0) break
    p1.hp -= Math.max(0, p2.atk - p1.def)
  }

  const winner = p1.hp > 0 ? ctx.from.first_name : opponent.first_name
  log += `🏆 <b>Pemenang:</b> ${winner}!\n🎉 Pertarungan selesai.`

  await ctx.replyWithHTML(log)
})
bot.command('summon10', async (ctx) => {
  const userId = ctx.from.id.toString()
  const userName = ctx.from.first_name

  await ctx.replyWithVoice({
    url: 'https://files.catbox.moe/3i02q0.mp3'
  }, { caption: '✨ Gacha dimulai... 10x Summon Waifu!' })

  const resultList = []

  for (let i = 0; i < 10; i++) {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu')
    const waifuUrl = res.data.url
    const rarity = generateRarity()
    const stats = generateStats(rarity)

    const waifu = {
      url: waifuUrl,
      rarity,
      stats,
      time: new Date().toISOString()
    }

    if (!waifuDB[userId]) waifuDB[userId] = []
    waifuDB[userId].push(waifu)
    resultList.push(waifu)
  }

  fs.writeFileSync(waifuFile, JSON.stringify(waifuDB, null, 2))

  for (const waifu of resultList) {
    const caption = `🎀 Kamu mendapatkan waifu baru, ${userName}!\n` +
      `⭐ Rarity: <b>${waifu.rarity}</b>\n` +
      `❤️ HP: ${waifu.stats.hp} | 🔪 ATK: ${waifu.stats.atk} | 🛡️ DEF: ${waifu.stats.def}`
    await ctx.replyWithPhoto({ url: waifu.url }, {
      caption,
      parse_mode: 'HTML'
    })
  }
})
bot.command('summon', async (ctx) => {
  const tiers = ['R', 'SR', 'SSR']
  const tier = tiers[Math.floor(Math.random() * tiers.length)]

  const stats = {
    hp: Math.floor(Math.random() * 50) + (tier === 'SSR' ? 150 : tier === 'SR' ? 120 : 100),
    atk: Math.floor(Math.random() * 20) + (tier === 'SSR' ? 30 : tier === 'SR' ? 20 : 15),
    def: Math.floor(Math.random() * 10) + (tier === 'SSR' ? 15 : tier === 'SR' ? 10 : 5)
  }

  // Ambil gambar karakter waifu random
  const { data } = await axios.get('https://api.waifu.pics/sfw/waifu')

  await ctx.replyWithPhoto(data.url, {
    caption: `🎴 Kamu memanggil seorang karakter dari dunia anime...

✨ [${tier}] Karakter Rahasia
❤️ HP: ${stats.hp} | ⚔️ ATK: ${stats.atk} | 🛡️ DEF: ${stats.def}
🌟 Tier: ${tier === 'SSR' ? 'Super Super Rare' : tier === 'SR' ? 'Super Rare' : 'Rare'}

${tier === 'SSR' ? '🔮 Dewa Gacha sedang memihakmu hari ini!' : ''}`,
    parse_mode: 'Markdown'
  })
})
bot.command('adventure', async (ctx) => {
  const nama = ctx.from.first_name || 'Pahlawan'
  const petualangan = [
    `🌲 ${nama} tersesat di hutan penuh monster! Apa yang akan kamu lakukan?`,
    `🧙 Kamu bertemu seorang penyihir misterius yang menawari ramuan ajaib...`,
    `👹 Seorang Oni muncul dan menatapmu dengan ganas!`
  ]
  const randomEvent = petualangan[Math.floor(Math.random() * petualangan.length)]

  await ctx.reply(`${randomEvent}\n\nPilih tindakan:`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚔️ Serang', callback_data: 'fight' }],
        [{ text: '🏃 Kabur', callback_data: 'run' }],
        [{ text: '🔍 Cari Item', callback_data: 'item' }]
      ]
    }
  })
})

bot.action(['fight', 'run', 'item'], async (ctx) => {
  const hasil = {
    fight: ['💥 Kamu berhasil mengalahkan monster!', '😵 Kamu kalah dan pingsan!'],
    run: ['🏃 Kamu berhasil kabur!', '😓 Kamu tersandung dan monster mengejarmu!'],
    item: ['🎁 Kamu menemukan potion HP!', '💨 Tidak ada apa-apa di sekitar.']
  }
  const res = hasil[ctx.callbackQuery.data]
  await ctx.answerCbQuery()
  await ctx.reply(res[Math.floor(Math.random() * res.length)])
})
bot.command('reinkarnasi', async (ctx) => {
  const namaUser = ctx.from.first_name || 'Pahlawan'
  const kelas = ['🧙‍♂️ Mage', '🗡️ Swordsman', '🧬 Healer', '🦴 Necromancer', '🐉 Dragon Rider']
  const dunia = ['Alvernia', 'Eldoria', 'Nifelheim', 'Chronosia', 'Nocturne']
  const skill = ['Time Manipulation', 'Firestorm', 'Heal All', 'Shadow Step', 'Dragon Roar', 'Divine Bless']

  const chosen = {
    kelas: kelas[Math.floor(Math.random() * kelas.length)],
    dunia: dunia[Math.floor(Math.random() * dunia.length)],
    skill: skill[Math.floor(Math.random() * skill.length)]
  }

  const caption = `✨ <b>[ Pemanggilan dari Dunia Lain ]</b> ✨

<b>📣 Dewa:</b> <i>"${namaUser}-kun... waktunya telah tiba."</i>

Kau telah dipanggil ke dunia <b>${chosen.dunia}</b> sebagai...

👤 <b>Kelas:</b> ${chosen.kelas}  
🔮 <b>Skill Awal:</b> <i>${chosen.skill}</i>

💠 Takdirmu kini di tanganmu, ${namaUser}.  
<i>Jadilah pahlawan... atau sesuatu yang lebih gelap...</i>`

  const animeBg = 'https://files.catbox.moe/ilqstf.jpg'

  // Fake reply bergaya pemanggilan dewa
  await ctx.replyWithPhoto(
    { url: animeBg },
    {
      caption,
      parse_mode: 'HTML',
      reply_to_message_id: ctx.message.message_id
    }
  )
})
//danjen
// Mulai dungeon
bot.command('dungeon', async (ctx) => {
  const userId = ctx.from.id
  if (dungeonSessions[userId]) return ctx.reply('❗ Kamu sedang berada di dungeon! Selesaikan dulu.')

  const enemy = slimeEnemies[Math.floor(Math.random() * slimeEnemies.length)]
  dungeonSessions[userId] = {
    player: { hp: 100, atk: 15, def: 5 },
    enemy: { ...enemy },
    turn: 'player'
  }

  const dungeonText = `🏰 *Dungeon Dimulai!*
Musuh muncul: *${enemy.name}*
❤️ HP Musuh: *${enemy.hp}*

⚔️ Serang dengan /attack atau pulihkan diri dengan /heal`;

await ctx.replyWithMarkdownV2(escapeMarkdownV2(dungeonText));
})

// Menyerang musuh
bot.command('attack', async (ctx) => {
  const userId = ctx.from.id
  const session = dungeonSessions[userId]
  if (!session) return ctx.reply('❗ Kamu belum masuk dungeon. Ketik /dungeon')
  if (session.turn !== 'player') return ctx.reply('⏳ Bukan giliranmu!')

  const player = session.player
  const enemy = session.enemy
  const damage = Math.max(0, player.atk - enemy.def + Math.floor(Math.random() * 5))
  enemy.hp -= damage

  let log = `⚔️ Kamu menyerang *${enemy.name}* dan memberikan *${damage}* damage!\n❤️ HP Musuh: ${Math.max(enemy.hp, 0)}`

  if (enemy.hp <= 0) {
    delete dungeonSessions[userId]
    log += `\n🎉 *Kamu menang! Dungeon selesai!*`
    await ctx.replyWithMarkdownV2(escapeMarkdownV2(log))
    await ctx.replyWithVoice(
      { url: 'https://files.catbox.moe/nue3sp.mp3' },
      { caption: '🎊 Efek kemenangan diputar!' }
    )
  } else {
    session.turn = 'enemy'
    let log = `Sekarang Giliran Musuh`
    await ctx.replyWithMarkdownV2(escapeMarkdownV2(log))
    setTimeout(() => enemyTurn(ctx, userId), 3000)
  }
})

// Memulihkan diri
bot.command('heal', async (ctx) => {
  const userId = ctx.from.id
  const session = dungeonSessions[userId]
  if (!session) return ctx.reply('❗ Kamu belum masuk dungeon.')
  if (session.turn !== 'player') return ctx.reply('⏳ Bukan giliranmu!')
  const healAmount = Math.floor(Math.random() * 20 + 10)
  session.player.hp = Math.min(session.player.hp + healAmount, 100)
  session.turn = 'enemy'
  const healText = `💚 Kamu memulihkan *${healAmount}* HP!\n❤️ Total HP: ${session.player.hp}\n⏳ Giliran musuh...`
await ctx.replyWithMarkdownV2(escapeMarkdownV2(healText))
  setTimeout(() => enemyTurn(ctx, userId), 3000)
})
async function enemyTurn(ctx, userId) {
  const session = dungeonSessions[userId]
  if (!session) return
  const player = session.player
  const enemy = session.enemy
  const damage = Math.max(0, enemy.atk - player.def + Math.floor(Math.random() * 5))
  player.hp -= damage
  let log = `😈 *${enemy.name}* menyerang dan memberikan *${damage}* damage padamu!\n❤️ HP Kamu: ${Math.max(player.hp, 0)}\n\n💡 Sekarang giliranmu! /attack atau /heal`
  if (player.hp <= 0) {
    delete dungeonSessions[userId]
    let log = `💀 *Kamu kalah... Dungeon gagal!*`
    await ctx.replyWithMarkdownV2(log)
    await ctx.replyWithVoice({ url: 'https://files.catbox.moe/73ywvh.mp3' }, { caption: '☠️ Suara kekalahan...' })
  } else {
    session.turn = 'player'
    const log = '💡 Sekarang giliranmu! /attack atau /heal'
await ctx.replyWithMarkdownV2(escapeMarkdownV2(log))
  }
}
///anime fight\\
bot.command('animefight', async (ctx) => {
  const userId = ctx.from.id
  const username = escapeMarkdownV2(ctx.from.username || ctx.from.first_name)
  const opponent = ctx.message.reply_to_message?.from
  if (!opponent) {
    return ctx.reply('❗ Balas pesan user yang ingin kamu tantang.')
  }
  const opponentId = opponent.id
  const opponentName = escapeMarkdownV2(opponent.username || opponent.first_name)
  if (fights[userId] || fights[opponentId]) {
    return ctx.reply('⚔️ Salah satu dari kalian sedang bertarung.')
  }
  // Simpan status pertarungan
  const player1 = { id: userId, name: username, hp: 100, atk: 15, def: 5 }
  const player2 = { id: opponentId, name: opponentName, hp: 100, atk: 15, def: 5 }
  fights[userId] = {
    turn: userId,
    players: {
      [userId]: player1,
      [opponentId]: player2
    }
  }
  fights[opponentId] = fights[userId]
  const text =
    `🎌 *Pertarungan dimulai!*\n` +
    `[${username}] vs [${opponentName}]\n\n` +
    `Ketik /hit untuk menyerang giliranmu!`
  await ctx.reply(escapeMarkdownV2(text), { parse_mode: 'MarkdownV2' })
})
bot.command('hit', async (ctx) => {
  const userId = ctx.from.id
  const fight = fights[userId]
  if (!fight) return ctx.reply('❗ Kamu tidak sedang dalam pertarungan.')
  if (fight.turn !== userId) return ctx.reply('⏳ Tunggu giliranmu!')
  
  const attacker = fight.players[userId]
  const defenderId = Object.keys(fight.players).find(id => id != userId)
  const defender = fight.players[defenderId]
  
  let log = `⚔️ *${attacker.name} menyerang ${defender.name}*\n`
  let baseDamage = Math.max(0, attacker.atk - defender.def + Math.floor(Math.random() * 5))
  let damage = baseDamage
  
  const critChance = Math.random()
  const missChance = Math.random()
  const healChance = Math.random()
  
  if (missChance < 0.1) {
    damage = 0
    log += '💨 Tapi serangannya meleset!\n'
  } else if (critChance < 0.2) {
    damage = Math.floor(damage * 1.5)
    log += '💥 Serangan *Critical Hit!*\n'
  } else if (healChance < 0.1) {
    const heal = Math.floor(Math.random() * 10 + 5)
    attacker.hp = Math.min(attacker.hp + heal, 100)
    log += `💖 ${attacker.name} menyembuhkan diri sebanyak +${heal} HP!\n`
  }

  defender.hp -= damage
  defender.hp = Math.max(defender.hp, 0)

  const hpBar = (hp) => {
    const full = '█'
    const empty = '░'
    const total = 10
    const filled = Math.round((hp / 100) * total)
    return full.repeat(filled) + empty.repeat(total - filled)
  }

  log += `\n❤️ ${defender.name} [${hpBar(defender.hp)}] ${defender.hp}%`

  if (defender.hp <= 0) {
    delete fights[userId]
    delete fights[defenderId]

    log += `\n\n🏆 *${attacker.name} menang mutlak!*\n🎉 Pertarungan selesai!`
    await ctx.replyWithMarkdown(log)
    await ctx.replyWithVoice({ url: 'https://files.catbox.moe/nue3sp.mp3' }, { caption: '🎉 Efek kemenangan diputar!' })
  } else {
    fight.turn = parseInt(defenderId)

    log += `\n\n⏳ Giliran *${defender.name}* dimulai! (30 detik)\nKetik /hit sekarang!`

    await ctx.replyWithMarkdown(log, {
      reply_markup: {
        inline_keyboard: [[{ text: '⚔️ Serang Sekarang', callback_data: 'next_turn' }]]
      }
    })

    // Timeout otomatis
    if (fight.timer) clearTimeout(fight.timer)
    fight.timer = setTimeout(() => {
      if (fight.turn === parseInt(defenderId)) {
        delete fights[userId]
        delete fights[defenderId]
        ctx.replyWithMarkdown(`⌛ *${defender.name} terlalu lama menyerang!*\n🏆 *${attacker.name} menang karena waktu habis!*`)
      }
    }, 30_000)
  }
})
// airi-chan \\
bot.command('ppcp', async (ctx) => {
  try {
    await ctx.replyWithChatAction('upload_photo')

    const { data: list } = await axios.get('https://raw.githubusercontent.com/iamriz7/kopel_/main/kopel.json')
    if (!Array.isArray(list) || list.length === 0) throw new Error('Data kosong')

    const random = list[Math.floor(Math.random() * list.length)]
    const cewek = random.female
    const cowok = random.male

    await ctx.replyWithVoice({
      url: 'https://files.catbox.moe/yhqa08.opus'
    }, {
      caption: '💞 PP Couple ditemukan! Nyaa~'
    })

    await ctx.replyWithPhoto({ url: cowok }, { caption: '🧑 Cowok' })
    await ctx.replyWithPhoto({ url: cewek }, { caption: '👧 Cewek' })

    await ctx.reply('Ingin pasangan lain?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Ganti PP Couple', callback_data: 'ppcp_retry' }]
        ]
      }
    })
  } catch (err) {
    console.error('[PP Couple Error]', err)
    ctx.reply('❌ Terjadi kesalahan saat memuat PP couple.')
  }
})

// Tombol retry
bot.action('ppcp_retry', async (ctx) => {
  ctx.message = ctx.update.callback_query.message
  ctx.update.message = ctx.message
  return bot.handleUpdate(ctx.update)
})
bot.command('airi', async (ctx) => {
  const prompt = ctx.message.text.split(' ').slice(1).join(' ')
  if (!prompt) return ctx.reply('🌸 Airi-chan butuh sesuatu untuk dijawab, ne~')
  await ctx.reply('💬 Airi sedang berpikir keras... (≧◡≦) ♡')
  const jawaban = await airiGeminiCommand(prompt)
  ctx.reply(`🌸 Airi-chan:\n${jawaban}`)
})
bot.command('tosdmtinggi', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1)
  const url = args[0]

  if (!url || !/^https?:\/\//i.test(url)) {
    return ctx.reply('📸 Kirim perintah seperti ini:\n/tosdmtinggi https://example.com/gambar.jpg')
  }

  const api = `https://zenzxz.dpdns.org/maker/tosdmtinggi?url=${encodeURIComponent(url)}`
  let tries = 0
  let success = false

  await ctx.reply('⏳ Sedang memproses gambar...')

  while (tries < 2 && !success) {
    try {
      const res = await axios.get(api, { timeout: 20000, responseType: 'arraybuffer' })
      const buffer = Buffer.from(res.data)

      await ctx.replyWithPhoto({ source: buffer }, {
        caption: `✅ Sukses! SDM Tinggi 🔗 ${url}`
      })
      success = true

    } catch (err) {
      tries++
      if (tries < 2) {
        await ctx.reply('🔁 Gagal memuat gambar, mencoba ulang...')
      } else {
        console.error('Gagal:', err.message)
        await ctx.reply(`❌ Gagal memproses gambar.\n📌 Pastikan link gambar valid dan server API aktif.`)
      }
    }
  }
})
bot.command("rpgmenu", async (ctx) => {
  await ctx.reply("🎮 *RPG Menu — Pilih kategori:*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🧭 Dungeon & PvE", callback_data: "rpg_dungeon" }],
        [{ text: "⚔️ PvP & Battle", callback_data: "rpg_pvp" }],
        [{ text: "🎴 Waifu & Gacha", callback_data: "rpg_waifu" }],
        [{ text: "🔙 Kembali", callback_data: "main_menu" }]
      ]
    }
  });
});

bot.command(['myip', 'ipbot'], async (ctx) => {
  const userId = ctx.from.id;

  if (userId !== OWNER_ID) {
    return ctx.reply('❌ Fitur ini hanya untuk pemilik bot.');
  }

  const http = require('http');

  http.get({
    host: 'api.ipify.org',
    port: 80,
    path: '/'
  }, (resp) => {
    resp.on('data', (ip) => {
      ctx.reply(`🔎 Alamat IP publik-ku saat ini:\n🌐 ${ip.toString()}`);
    });
  }).on('error', (err) => {
    ctx.reply(`❌ Gagal mengambil IP: ${err.message}`);
  });
});
bot.command(['sc', 'script'], async (ctx) => {
  const ownerNumber = '6285606389689' // Ganti dengan nomor WhatsApp kamu
  const replyMessage = ctx.message.message_id // ID pesan user untuk fake reply

  await ctx.reply('🧠 Nyari script? Buy dong~ 😋', {
    reply_to_message_id: replyMessage, // ✅ Fake reply ke pesan user
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💬 Chat WhatsApp Owner', url: `https://wa.me/${ownerNumber}` }
        ]
      ]
    }
  })
})
//Discord\\
bot.command('cekdiscord', async (ctx) => {
  const text = ctx.message.text.split(' ')[1]
  if (!text) {
    return ctx.reply('❌ Kirim link atau kode undangan Discord.\n\nContoh:\n`/cekdiscord discord.gg/seiren` atau `/cekdiscord seiren`', {
      parse_mode: 'Markdown'
    })
  }

  const code = text.replace('https://discord.gg/', '').replace('discord.gg/', '')
  const url = `https://discord.com/api/v9/invites/${code}?with_counts=true&with_expiration=true`

  try {
    const res = await axios.get(url)
    const data = res.data

    const name = data.guild?.name || 'Tidak diketahui'
    const splash = data.guild?.splash
    const icon = data.guild?.icon
    const online = data.approximate_presence_count
    const total = data.approximate_member_count
    const invite = `https://discord.gg/${code}`
    const image = splash
      ? `https://cdn.discordapp.com/splashes/${data.guild.id}/${splash}.png`
      : icon
      ? `https://cdn.discordapp.com/icons/${data.guild.id}/${icon}.png`
      : null

    let teks = `📡 *Informasi Server Discord:*\n\n`
    teks += `📛 Nama: *${name}*\n`
    teks += `👥 Member: *${total}* total, *${online}* online\n`
    teks += `🔗 Invite: ${invite}`

    if (image) {
      await ctx.replyWithPhoto({ url: image }, {
        caption: teks,
        parse_mode: 'Markdown'
      })
    } else {
      await ctx.reply(teks, { parse_mode: 'Markdown' })
    }

  } catch (e) {
    console.error('❌ Error Discord:', e.message)
    ctx.reply('❌ Gagal mengambil info server Discord. Cek ulang kode undangan.')
  }
})

///Batas Server\\\
bot.command('ping', async (ctx) => {
  const start = Date.now()
  const sent = await ctx.reply('⏳ Menyusun panel statistik...')

  try {
    const latency = Date.now() - start
    const uptime = process.uptime()
    const used = process.memoryUsage().rss / 1024 / 1024
    const totalUser = Object.keys(users).length
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    const statusEmoji =
      latency < 200 ? '🟢' : latency < 500 ? '🟡' : '🔴'

    const teks = `📊 *Panel Statistik Bot*

${statusEmoji} *Status Koneksi*: \`${latency}ms\`  
⏱ *Uptime*: \`${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s\`  
💾 *RAM*: \`${used.toFixed(2)} MB\`  
👥 *Pengguna*: \`${totalUser} user\`  
🕒 *Waktu Server*: \`${waktu}\``

    await ctx.reply(teks, {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh Panel', callback_data: 'panel_ping' }]
        ]
      }
    })

    await ctx.telegram.deleteMessage(sent.chat.id, sent.message_id)
  } catch (e) {
    console.error('❌ Ping Panel Error:', e)
    ctx.reply('❌ Gagal mengambil data panel.')
  }
})

// Tombol Refresh Panel
bot.action('panel_ping', async (ctx) => {
  const latency = Math.floor(Math.random() * 300) + 100
  const uptime = process.uptime()
  const used = process.memoryUsage().rss / 1024 / 1024
  const totalUser = Object.keys(users).length
  const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

  const statusEmoji =
    latency < 200 ? '🟢' : latency < 500 ? '🟡' : '🔴'

  const teks = `📊 *Panel Statistik Bot (Refresh)*

${statusEmoji} *Status Koneksi*: \`${latency}ms\`  
⏱ *Uptime*: \`${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s\`  
💾 *RAM*: \`${used.toFixed(2)} MB\`  
👥 *Pengguna*: \`${totalUser} user\`  
🕒 *Waktu Server*: \`${waktu}\``

  await ctx.editMessageText(teks, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Refresh Panel', callback_data: 'panel_ping' }]
      ]
    }
  })
})
// === Mode NPC OpenAI ===
bot.command('laguai', async (ctx) => {
  const tema = ctx.message.text.split(' ').slice(1).join(' ')
  if (!tema) {
    return ctx.reply('🎧 Ketik perintah seperti: `/laguai tentang kesepian`', { parse_mode: 'Markdown' })
  }

  await ctx.replyWithChatAction('typing')

  const fakeLink = `https://songr.ai/result?q=${encodeURIComponent(tema)}&from=seiren-bot`
  await ctx.replyWithPhoto(
  { url: 'https://files.catbox.moe/v3sixd.jpg' },
  {
    caption:
      '🎵 *AI Song Generator*\n\n' +
      '*Tema:* _tentang introvert_\n' +
      '*Genre:* 🎼 Pop AI\n\n' +
      '🔗 [Dengarkan hasil lagumu di sini](https://songr.ai/result?q=tentang%20introvert&from=seiren-bot)\n\n' +
      '_Terima kasih telah menggunakan Seiren Bot x SongR_',
    parse_mode: 'Markdown',
    reply_to_message_id: ctx.message.message_id
  }
)
})

bot.command('npc', async (ctx) => {
  const msg = ctx.message.text.split(' ').slice(1).join(' ')
  if (!msg) return ctx.reply('💬 Kirim pesan ke NPC, contoh: /npc kamu lucu')

  ctx.reply('⏳ Mengetik...')

  const reply = await askNPC(msg)
  if (reply) {
    ctx.reply(`🤖 *NPC*: ${reply}`, { parse_mode: 'Markdown' })
  } else {
    ctx.reply('❌ Gagal merespons. Periksa koneksi atau API key.')
  }
})

bot.command('nonpc', (ctx) => {
  const id = ctx.from.id
  npcSession[id] = false
  ctx.reply('🛑 Mode NPC dimatikan.')
})

// === Airi-chan Tsundere Bot =
bot.command('tourl', async (ctx) => {
  const reply = ctx.message.reply_to_message
  if (!reply || !(reply.photo || reply.document || reply.video)) {
    return ctx.reply('❌ Balas media (foto, video, atau dokumen) dengan perintah /tourl')
  }
  await ctx.reply('⏳ Mengupload media ke server Catbox...')
  const fileId = reply.document?.file_id || reply.photo?.slice(-1)[0]?.file_id || reply.video?.file_id
  const file = await ctx.telegram.getFile(fileId)
  const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`
  const fileName = `temp_${Date.now()}`
  try {
    const writer = fs.createWriteStream(fileName)
    const response = await axios({ method: 'GET', url: fileUrl, responseType: 'stream' })
    response.data.pipe(writer)
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', fs.createReadStream(fileName))
    const upload = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    })
    await ctx.reply(`✅ *Berhasil diupload:*\n${upload.data}`, {
      parse_mode: 'Markdown'
    })
    fs.unlinkSync(fileName) // Hapus file sementara
  } catch (err) {
    console.error(err)
    ctx.reply('❌ Gagal mengupload media.')
  }
})
bot.command('kanade', async (ctx) => {
  const msg = ctx.message.text.split(' ').slice(1).join(' ')
  if (!msg) return ctx.reply('💬 Kirim pesan ke Kanade-chan, contoh: /kanade kamu lucu')
  const res = generateAiriReply(msg)
  ctx.reply(`💗 *Airi-chan*: ${res}`, { parse_mode: 'Markdown' })
})

function generateAiriReply(msg) {
  const responses = [
    "I-itu... bukan berarti aku suka kamu atau apapun, ya! 😳",
    "Hmph, dasar baka! Tapi... makasih.",
    "Jangan ngomong hal aneh seperti itu... ugh!",
    "Kau selalu merepotkan, tapi... aku senang kau ada. 😶",
    "Huh? Siapa yang lucu? Aku? B-bodoh!"
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

// === Waifu Generator ===
bot.command('waifu', async (ctx) => {
  try {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu')
    await ctx.replyWithPhoto(
      { url: res.data.url },
      {
        caption: '💘 Waifu kamu hari ini~',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔁 Generate Lagi', callback_data: 'waifu_again' }
          ]]
        }
      }
    )
  } catch {
    ctx.reply('❌ Gagal ambil gambar waifu.')
  }
})

bot.action('waifu_again', async (ctx) => {
  try {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu')
    await ctx.replyWithPhoto(
      { url: res.data.url },
      {
        caption: '💘 Waifu baru muncul lagi~',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔁 Generate Lagi', callback_data: 'waifu_again' }
          ]]
        }
      }
    )
  } catch {
    ctx.reply('❌ Gagal ambil gambar waifu.')
  }
})
// === Fitur Rekomood: Rekomendasi Anime Berdasarkan Mood ===
const animeMoodList = {
  sedih: [
    {
      title: 'Clannad: After Story',
      desc: 'Anime yang menyayat hati dan penuh emosi.',
      url: 'https://myanimelist.net/anime/4181/Clannad__After_Story',
      thumb: 'https://cdn.myanimelist.net/images/anime/1299/110774.jpg'
    },
    {
      title: 'Anohana',
      desc: 'Tentang kehilangan dan pertemanan masa kecil.',
      url: 'https://myanimelist.net/anime/9989/Ano_Hi_Mita_Hana_no_Namae_wo_Bokutachi_wa_Mada_Shiranai',
      thumb: 'https://cdn.myanimelist.net/images/anime/5/79697.jpg'
    },
    {
      title: 'Your Lie in April',
      desc: 'Musik dan cinta yang tragis.',
      url: 'https://myanimelist.net/anime/23273/Shigatsu_wa_Kimi_no_Uso',
      thumb: 'https://cdn.myanimelist.net/images/anime/3/67177.jpg'
    }
  ],
  senang: [
    {
      title: 'K-On!',
      desc: 'Gadis-gadis imut main musik di sekolah.',
      url: 'https://myanimelist.net/anime/5680/K-On',
      thumb: 'https://cdn.myanimelist.net/images/anime/10/71933.jpg'
    },
    {
      title: 'Barakamon',
      desc: 'Penuh tawa dan ketenangan di desa.',
      url: 'https://myanimelist.net/anime/22789/Barakamon',
      thumb: 'https://cdn.myanimelist.net/images/anime/3/76096.jpg'
    },
    {
      title: 'Nichijou',
      desc: 'Kehidupan sehari-hari yang absurd dan lucu.',
      url: 'https://myanimelist.net/anime/10165/Nichijou',
      thumb: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg'
    }
  ],
  // Tambahkan mood lainnya seperti marah, cinta, dll jika mau
}

bot.command('rekomood', async (ctx) => {
  const mood = ctx.message.text.split(' ')[1]?.toLowerCase()
  const data = animeMoodList[mood]

  if (!mood || !data) {
    return ctx.reply('❌ Gunakan format: /rekomood <sedih|senang>')
  }

  for (const anime of data) {
    await ctx.replyWithPhoto(
      { url: anime.thumb },
      {
        caption: `🎬 *Clannad: After Story*\n\n_Anime yang menyayat hati dan penuh emosi._\n\n🔗 [Lihat di MyAnimeList](https://myanimelist.net/anime/4181/Clannad__After_Story)`,
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id // Fake reply
      }
    )
  }
})

bot.command('rekomendasi', async (ctx) => {
  // Daftar genre dengan ID dari Jikan (https://api.jikan.moe/v4/genres/anime)
  const genreList = [
    { id: 1, name: 'Action' },
    { id: 4, name: 'Comedy' },
    { id: 22, name: 'Romance' },
    { id: 8, name: 'Drama' },
    { id: 24, name: 'Sci-Fi' },
    { id: 10, name: 'Fantasy' },
    { id: 7, name: 'Mystery' },
    { id: 14, name: 'Horror' },
    { id: 36, name: 'Slice of Life' }
  ]

  const randomGenre = genreList[Math.floor(Math.random() * genreList.length)]

  try {
    const res = await axios.get(`https://api.jikan.moe/v4/anime?genres=${randomGenre.id}&order_by=score&sort=desc&limit=20`)
    const animeList = res.data.data
    if (!animeList || animeList.length === 0) return ctx.reply('❌ Tidak ada rekomendasi ditemukan.')

    const chosen = animeList[Math.floor(Math.random() * animeList.length)]
    const { title, synopsis, images, url } = chosen

    const fakeReply = await ctx.reply(`🎲 Mencari anime genre *${randomGenre.name}*...`, { parse_mode: 'Markdown' })

    await ctx.replyWithPhoto(
      { url: images.jpg.large_image_url },
      {
        caption: `✨ *${title}*\n\n_${synopsis ? synopsis.slice(0, 400) + '...' : 'Tidak ada deskripsi.'}_\n\n🎬 [Tonton di MAL](${url})`,
        parse_mode: 'Markdown',
        reply_to_message_id: fakeReply.message_id
      }
    )
  } catch (err) {
    console.error('❌ Error rekomendasi:', err.message)
    ctx.reply('❌ Gagal mengambil rekomendasi.')
  }
})

// === /ramalwaifu Fallback versi ===
bot.command('ramalwaifu', async (ctx) => {
  addStat('/ramalwaifu')
  const userId = ctx.from.id
  const userName = ctx.from.username || ctx.from.first_name

  const waifus = ['Rem', 'Asuna', 'Zero Two', 'Kurumi', 'Hinata', 'Mai Sakurajima', 'Rias Gremory', 'Megumin', 'Yor Forger', 'Nezuko']
  const status = ['Sangat mencintaimu >\\< 💗', 'Sedang merindukanmu 🥺', 'Ngambek sama kamu 😤', 'Menunggumu di dunia isekai 😌']
  const mood = ['Tsundere 🔥', 'Yandere 😈', 'Kuudere ❄️', 'Dandere 😶', 'Genki 🌈']
  const pesan = ['Jangan selingkuh, ya~', 'Belikan boba sekarang!', 'Peluk dia segera!', 'Ajak nonton anime favorit.']
  const percent = Math.floor(Math.random() * 101)

  // Update statistik
  if (!waifuStats[userId]) {
    waifuStats[userId] = { name: userName, count: 0 }
  }
  waifuStats[userId].count++
  saveWaifuStats()

  try {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu')
    const img = res.data.url

    await ctx.replyWithPhoto({ url: img }, {
      caption:
`🔮 *Ramalan Waifu Kamu Hari Ini*

💘 *Waifu*: ${waifus[Math.floor(Math.random() * waifus.length)]}
❤️ *Status*: ${status[Math.floor(Math.random() * status.length)]}
🌟 *Mood*: ${mood[Math.floor(Math.random() * mood.length)]}
🍀 *Keberuntungan*: ${percent}%
📜 *Pesan*: ${pesan[Math.floor(Math.random() * pesan.length)]}

Gunakan /waifuleaderboard untuk lihat ranking pecinta waifu!`,
      parse_mode: 'Markdown'
    })
  } catch {
    ctx.reply('❌ Gagal mengambil gambar waifu.')
  }
})

bot.command('waifuleaderboard', (ctx) => {
  addStat('/waifuleaderboard')
  const leaderboard = Object.entries(waifuStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)

  if (leaderboard.length === 0) return ctx.reply('📊 Belum ada pengguna yang diramal waifunya.')

  let teks = '🏆 *Leaderboard Pecinta Waifu*\n\n'
  leaderboard.forEach(([id, data], i) => {
    teks += `${i + 1}. ${data.name} — ${data.count}x ramal waifu\n`
  })

  ctx.reply(teks, { parse_mode: 'Markdown' })
})
///anime
bot.command('jadwalanime', async (ctx) => {
  try {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = new Date()
    const dayName = dayMap[today.getDay()]
    const res = await axios.get(`https://api.jikan.moe/v4/schedules/${dayName.toLowerCase()}`)
    const list = res.data.data.slice(0, 10) // Ambil 10 anime teratas

    let teks = `📺 *Jadwal Anime Hari ${escapeMarkdownV2(dayName.toUpperCase())}*\n\n`
    for (const anime of list) {
      teks += `• *${escapeMarkdownV2(anime.title)}*\n🔗 ${escapeMarkdownV2(anime.url)}\n\n`
    }

    await ctx.reply(teks, { parse_mode: 'MarkdownV2' })
  } catch (err) {
    console.error('❌ Error ambil jadwal anime:', err.message)
    ctx.reply('❌ Gagal mengambil jadwal anime.')
  }
})

bot.command('anime', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ')
  if (!query) return ctx.reply('❗ Contoh: /anime Kimetsu no Yaiba')

  try {
    const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`)
    const anime = res.data.data[0]

    if (!anime) return ctx.reply('❌ Anime tidak ditemukan.')

    const caption = `🎌 <b>${anime.title}</b>\n\n` +
      `📺 <b>Type:</b> ${anime.type}\n` +
      `📅 <b>Airing:</b> ${anime.aired.string}\n` +
      `🔢 <b>Episodes:</b> ${anime.episodes ?? '??'}\n` +
      `⭐ <b>Rating:</b> ${anime.score ?? '??'}\n` +
      `📖 <b>Sinopsis:</b>\n${anime.synopsis?.slice(0, 500) || 'Tidak tersedia.'}\n\n` +
      `🔗 <a href="${anime.url}">MyAnimeList</a>`

    await ctx.replyWithPhoto(
      { url: anime.images.jpg.image_url },
      {
        caption,
        parse_mode: 'HTML'
      }
    )
  } catch (err) {
    console.error('❌ Error ambil data anime:', err.message)
    ctx.reply('❌ Gagal mengambil data anime.')
  }
})
//auto detect\\
bot.command('totalfitur', async (ctx) => {
  try {
    const file = fs.readFileSync('./index.js', 'utf-8')
    const regex = /bot\.command\(['"`](.*?)['"`],/g
    const commands = new Set()
    let match
    while ((match = regex.exec(file)) !== null) {
      const cmd = match[1]
      if (!cmd.startsWith('/')) commands.add('/' + cmd)
    }
    const total = commands.size
    const fakeReplyText = `🧠 *SEIREN SYSTEM CORE REPORT*\n\n📦 Total fitur aktif dalam sistem: *${total}*\n\n🔍 Module Check: *Stable*\n🛰️ Status Sistem: *Operational*\n\n_Seiren A.I. selalu berkembang demi master._ 💫`
    await ctx.reply(fakeReplyText, {
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    })
  } catch (err) {
    console.error(err)
    await ctx.reply('❌ Gagal membaca total fitur.', {
      reply_to_message_id: ctx.message.message_id
    })
  }
})
bot.command('menu', async (ctx) => {
  addStat('/menu')
  const file = fs.readFileSync('./index.js', 'utf-8')
  const regex = /bot\.command\(['"`](.*?)['"`],/g
  const commands = []
  let match
  while ((match = regex.exec(file)) !== null) {
    const cmd = match[1]
    if (!cmd.startsWith('/')) commands.push('/' + cmd)
  }
  const listCmd = commands
    .filter(cmd => cmd !== '/menu')
    .map(cmd => `• ${cmd}`)
    .join('\n')

  const teks = `*🌸 Daftar Fitur Seiren (Auto Deteksi)*

${listCmd}

━━━━━━━━━━━━━━━
*Gunakan salah satu perintah di atas untuk mencoba fitur!* 💡`

  await ctx.replyWithPhoto(
    { url: 'https://files.catbox.moe/26198v.jpeg' }, // Gambar header
    {
      caption: teks,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Kembali ke /help', callback_data: 'help_back' }]
        ]
      }
    }
  )
})

////Game Tipis Tipis \\\\
const pets = fs.existsSync('./db/pets.json') ? require('./db/pets.json') : {}
const petFile = './db/pets.json'

function savePets() {
  fs.writeFileSync(petFile, JSON.stringify(pets, null, 2))
}

const petList = [
  { name: 'Rem', image: 'https://files.catbox.moe/v576cj.jpg' },
  { name: 'Zero Two', image: 'https://files.catbox.moe/o5serr.jpg' },
  { name: 'Kurumi', image: 'https://files.catbox.moe/yro161.jpg' },
]

bot.command('adopsi', async (ctx) => {
  const id = ctx.from.id
  if (pets[id]) return ctx.reply('❌ Kamu sudah mengadopsi pet.')

  const pet = petList[Math.floor(Math.random() * petList.length)]
  pets[id] = {
    name: pet.name,
    image: pet.image,
    affection: 0
  }
  savePets()

  await ctx.replyWithPhoto(pet.image, {
    caption: `🎉 Kamu mengadopsi *${pet.name}* sebagai pet anime-mu! Jaga baik-baik ya~`,
    parse_mode: 'Markdown'
  })
})

bot.command('petku', (ctx) => {
  const id = ctx.from.id
  const pet = pets[id]
  if (!pet) return ctx.reply('❌ Kamu belum punya pet. Ketik /adopsi untuk mengadopsi satu!')

  ctx.replyWithPhoto(pet.image, {
    caption: `🐾 *${pet.name}*\n❤️ Kasih Sayang: ${pet.affection}`,
    parse_mode: 'Markdown'
  })
})

bot.command('kasihsayang', (ctx) => {
  const id = ctx.from.id
  const pet = pets[id]
  if (!pet) return ctx.reply('❌ Kamu belum punya pet.')

  pet.affection += Math.floor(Math.random() * 10) + 1
  savePets()
  ctx.reply(`💖 Kamu bermain dengan *${pet.name}*. Kasih sayangnya bertambah menjadi ${pet.affection}!`, { parse_mode: 'Markdown' })
})

bot.command('lepas', (ctx) => {
  const id = ctx.from.id
  if (!pets[id]) return ctx.reply('❌ Kamu tidak punya pet.')

  const nama = pets[id].name
  delete pets[id]
  savePets()
  ctx.reply(`💔 Kamu telah melepaskan *${nama}*. Sayonara...`, { parse_mode: 'Markdown' })
})

bot.command('petboard', (ctx) => {
  const sorted = Object.entries(pets).sort((a, b) => b[1].affection - a[1].affection).slice(0, 10)
  let teks = '🏆 *Leaderboard Kasih Sayang Pet*\n\n'
  sorted.forEach(([uid, data], i) => {
    teks += `${i + 1}. ${data.name} - ❤️ ${data.affection}\n`
  })
  ctx.reply(teks, { parse_mode: 'Markdown' })
})
const triviaList = [
  { q: 'Siapa karakter utama di Naruto?', a: 'Naruto Uzumaki' },
  { q: 'Anime apa yang memiliki tokoh bernama Luffy?', a: 'One Piece' },
  { q: 'Siapa pencipta anime Attack on Titan?', a: 'Hajime Isayama' }
]

bot.command('triviapvp', async (ctx) => {
  const opponent = ctx.message.text.split(' ')[1]
  if (!opponent) return ctx.reply('⚔️ Masukkan username lawan! Contoh: /triviapvp @kyuu')

  const t = triviaList[Math.floor(Math.random() * triviaList.length)]
  ctx.reply(`🤺 Trivia PvP Dimulai!\n\n*${t.q}*\nJawab dalam 20 detik!`, {
    parse_mode: 'Markdown'
  })

  const filter = (replyCtx) => replyCtx.message.text.toLowerCase().includes(t.a.toLowerCase())
  bot.on('text', async (replyCtx) => {
    if (filter(replyCtx)) {
      await replyCtx.reply(`🏆 Jawaban benar! ${replyCtx.from.username} menang!`)
    }
  })

  setTimeout(() => {
    ctx.reply(`⌛ Waktu habis! Jawaban: *${t.a}*`, { parse_mode: 'Markdown' })
  }, 20000)
})

bot.command('voice', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ')
  if (!input.includes('|')) {
    return ctx.reply('⚠️ Gunakan format: /voice <nama karakter> | <teks>')
  }

  const [char, text] = input.split('|').map(s => s.trim())
  try {
    await ctx.reply(`🎙 Menghasilkan suara ${char}...`)

    // Simulasi audio (diganti dengan API asli jika kamu punya akses)
    const audioURL = 'https://example.com/sample-voice.mp3' // Ganti dengan hasil dari API
    await ctx.replyWithAudio({ url: audioURL }, {
      title: `Voice ${char}`,
      performer: 'Anime TTS'
    })
  } catch (e) {
    console.error(e)
    ctx.reply('❌ Gagal menghasilkan suara.')
  }
})

const duelRequests = {}

bot.command('waifupvp', async (ctx) => {
  const challengerId = ctx.from.id
  const challengerName = ctx.from.first_name || ctx.from.username

  const mentioned = ctx.message.reply_to_message
  if (!mentioned) {
    return ctx.reply('⚔️ Balas pesan lawanmu untuk menantang PvP Waifu!')
  }

  const opponentId = mentioned.from.id
  const opponentName = mentioned.from.first_name || mentioned.from.username

  if (challengerId === opponentId) {
    return ctx.reply('😅 Kamu tidak bisa PvP dengan diri sendiri.')
  }

  const duelId = `${challengerId}_${opponentId}`
  duelRequests[duelId] = ctx.message.message_id // Simpan ID untuk fake reply nanti

  await ctx.replyWithMarkdown(
    `*${challengerName}* menantang *${opponentName}* untuk duel Waifu!\n\nKlik tombol untuk menerima:`,
    {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Terima Duel', callback_data: `accept_${duelId}` }
        ]]
      }
    }
  )
})

bot.action(/^accept_(.+)/, async (ctx) => {
  const duelId = ctx.match[1]
  const replyMsgId = duelRequests[duelId]

  if (!duelRequests[duelId]) {
    return ctx.reply('❌ Duel sudah tidak tersedia.')
  }

  delete duelRequests[duelId]

  const [challengerId, opponentId] = duelId.split('_')

  const getWaifu = async () => {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu')
    const power = Math.floor(Math.random() * 100) + 1
    return { url: res.data.url, power }
  }

  const [waifu1, waifu2] = await Promise.all([getWaifu(), getWaifu()])

  const p1 = waifu1.power
  const p2 = waifu2.power

  await ctx.replyWithPhoto({ url: waifu1.url }, {
    caption: `🔥 Waifu Penantang\nPower: ${p1}`,
    reply_to_message_id: replyMsgId
  })

  await ctx.replyWithPhoto({ url: waifu2.url }, {
    caption: `❄️ Waifu Penantang Balasan\nPower: ${p2}`,
    reply_to_message_id: replyMsgId
  })

  const winnerText =
    p1 > p2 ? '🚀 Penantang menang!' :
    p2 > p1 ? '🏆 Lawan menang!' :
    '🤝 Seri!'

  await ctx.reply(winnerText, {
    reply_to_message_id: replyMsgId
  })
})

bot.command('slot', async (ctx) => {
  const emojis = ['🌸', '🧸', '✨', '🎀', '🍡', '💮']
  const [s1, s2, s3] = [
    emojis[Math.floor(Math.random() * emojis.length)],
    emojis[Math.floor(Math.random() * emojis.length)],
    emojis[Math.floor(Math.random() * emojis.length)]
  ]

  let hasil = ''
  if (s1 === s2 && s2 === s3) {
    hasil = '🎉 *JACKPOT!* Kamu menang besar!'
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    hasil = '✨ Lumayan! Kamu menang kecil.'
  } else {
    hasil = '😢 Belum beruntung, coba lagi!'
  }

  try {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu')
    const waifuUrl = res.data.url

    await ctx.replyWithPhoto(
      { url: waifuUrl },
      {
        caption: `🎰 *Mesin Slot Anime*\n\n[ ${s1} | ${s2} | ${s3} ]\n\n${hasil}`,
        parse_mode: 'Markdown',
        reply_to_message_id: ctx.message.message_id
      }
    )
  } catch (err) {
    console.error(err)
    ctx.reply('❌ Gagal mengambil waifu.', {
      reply_to_message_id: ctx.message.message_id
    })
  }
})

const karakterSuara = [
  {
    nama: "Gojo Satoru",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/gojo.mp3"
  },
  {
    nama: "Naruto Uzumaki",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/naruto.mp3"
  },
  {
    nama: "Eren Yeager",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/eren.mp3"
  },
  {
    nama: "Luffy",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/luffy.mp3"
  },
  {
    nama: "Kaguya Shinomiya",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/kaguya.mp3"
  },
  {
    nama: "Chika Fujiwara",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/chika.mp3"
  },
  {
    nama: "Anya Forger",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/anya.mp3"
  },
  {
    nama: "Makima",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/makima.mp3"
  },
  {
    nama: "Ayanokoji",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/ayanokoji.mp3"
  },
  {
    nama: "Rimuru Tempest",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/rimuru.mp3"
  },
  {
    nama: "Klee",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/klee.mp3"
  },
  {
    nama: "Rika Orimoto",
    suara: "https://github.com/kylebot-id/audio-anime/raw/main/rika.mp3"
  }
]

let jawabanTebakan = {}

bot.command('tebaksuara', async (ctx) => {
  const userId = ctx.from.id
  const pick = karakterSuara[Math.floor(Math.random() * karakterSuara.length)]
  jawabanTebakan[userId] = pick.nama.toLowerCase()

  await ctx.replyWithAudio({ url: pick.suara }, {
    title: '🎧 Suara siapakah ini?',
    caption: '🎮 *Tebak Suara Karakter Anime*\nJawab siapa nama karakter ini dalam waktu 20 detik!',
    parse_mode: 'Markdown'
  })

  setTimeout(() => {
    if (jawabanTebakan[userId]) {
      ctx.reply(`⏰ Waktu habis! Jawaban yang benar adalah: *${pick.nama}*`, {
        parse_mode: 'Markdown'
      })
      delete jawabanTebakan[userId]
    }
  }, 20000)
})

// Cek jawaban user
bot.on('text', (ctx) => {
  const userId = ctx.from.id
  const answer = ctx.message.text.toLowerCase()

  if (jawabanTebakan[userId]) {
    if (answer.includes(jawabanTebakan[userId])) {
      ctx.reply(`✅ Benar! Itu adalah *${jawabanTebakan[userId]}*!`, { parse_mode: 'Markdown' })
      delete jawabanTebakan[userId]
    }
  }
})
///ANIME TOTALIS\\\
// --- Fitur Jadwal Anime Harian dari Jikan API ---
const suaraAnime = [
  {
    file: './audio/levi.mp3', // pastikan file ini ada
    jawab: 'levi'
  },
  {
    file: './audio/gojo.mp3',
    jawab: 'gojo'
  },
  {
    file: './audio/luffy.mp3',
    jawab: 'luffy'
  }
]

const tebakan = {} // userId: jawaban

bot.command('tebaksuara', async (ctx) => {
  addStat('/tebaksuara')

  const random = suaraAnime[Math.floor(Math.random() * suaraAnime.length)]
  const id = ctx.from.id

  tebakan[id] = random.jawab.toLowerCase()

  await ctx.replyWithAudio({ source: random.file }, {
    caption: '🧠 Tebak suara ini! Siapa nama karakter anime-nya?\n\nKetik jawabanmu di bawah!'
  })
})

// Jawaban pengguna
bot.on('text', async (ctx) => {
  const id = ctx.from.id
  const msg = ctx.message.text.trim().toLowerCase()

  // Cek apakah sedang dalam sesi tebak suara
  if (tebakan[id]) {
    const benar = tebakan[id]
    if (msg === benar) {
      await ctx.reply('🎉 Benar! Kamu menjawab dengan tepat: ' + benar.toUpperCase())
    } else {
      await ctx.reply('❌ Salah. Coba lagi atau ketik /tebaksuara untuk pertanyaan baru.')
    }
    delete tebakan[id]
    return
  }

  // Lanjut ke respon biasa atau fitur lainnya...
})
// Cuaca tombol
bot.action('weather_jakarta', async (ctx) => {
  addStat('/cuaca')
  const info = await getWeather('jakarta')
  ctx.editMessageText(info)
})

// === Log & NPC Auto Mode ===
bot.on('text', async (ctx) => {
  const user = ctx.from.username || ctx.from.first_name
  const id = ctx.from.id
  const msg = ctx.message.text
  const waktu = new Date().toLocaleString()

  const log = `[${waktu}] ${user} (${id}): ${msg}\n`
  fs.appendFileSync('log.txt', log)
  console.log(log.trim())

  if (!users[id]) {
    users[id] = { username: user }
    fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
  }

if (!msg.startsWith('/')) {
  addExp(id, user, ctx)
}

  if (npcSession[id]) {
    try {
      const res = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah NPC bernama Aria di dunia RPG, berbicara dengan gaya tsundere dan misterius.'
          },
          { role: 'user', content: msg }
        ]
      })
      const reply = res.data.choices[0].message.content
      ctx.reply(reply)
    } catch (e) {
      ctx.reply('❌ Gagal merespons. Periksa koneksi atau API key.')
    }
  }
})

function addExp(userId, username, ctx) {
  if (!users[userId]) {
    users[userId] = {
      username,
      exp: 0,
      level: 1,
      nextExp: 100
    }
  }

  const user = users[userId]
  const gained = Math.floor(Math.random() * 8) + 3 // Exp antara 3-10
  user.exp += gained

  if (user.exp >= user.nextExp) {
    user.level += 1
    user.exp = user.exp - user.nextExp
    user.nextExp = Math.floor(user.nextExp * 1.2)

    const url = `https://api.popcat.xyz/levelcard?username=${encodeURIComponent(user.username)}&level=${user.level}&xp=${user.exp}&req=${user.nextExp}&avatar=https://api.dicebear.com/7.x/anime/svg?seed=${user.username}`
    
    ctx.replyWithPhoto({ url }, {
      caption: `🎉 *Level Up!*\n${user.username} sekarang level *${user.level}*! 🔥`,
      parse_mode: 'Markdown',
      reply_to_message_id: ctx.message.message_id
    })
  }

  fs.writeFileSync('./users.json', JSON.stringify(users, null, 2))
}

bot.launch()
console.log('🤖 Bot Telegram Aktif di Termux')

// Hapus file saat keluar
process.on('SIGINT', () => process.exit())
process.on('SIGTERM', () => process.exit())
process.on('exit', () => {
  const files = fs.readdirSync(__dirname).filter(f => f.startsWith('yt-audio-') && f.endsWith('.mp3'))
  for (const f of files) fs.unlinkSync(path.join(__dirname, f))
})