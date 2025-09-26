import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// La API + API KEY juntas en una línea
const api = `https://api.neoxr.eu/api/youtube?apikey=F0svKu`;

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL válido de YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) return m.reply('No se encontraron resultados para tu búsqueda');
    url = searchResults.videos[0].url;
  }

  try {
    await m.react('🕒');

    // Usamos template string para unir url con API
    const queryUrl = `${api}&url=${encodeURIComponent(url)}&type=audio&quality=128kbps`;

    const { data } = await axios.get(queryUrl, { timeout: 30000 });

    if (!data.status || !data.data || !data.data.url) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No se pudo obtener el mp3');
    }

    const { title, thumbnail, channel, duration, data: downloadData } = data;
    const { url: audioUrl, filename } = downloadData || data;
    const fileName = filename || `${title}.mp3`.replace(/[\\/:*?"<>|]/g, '_');

    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/\s/g, '_')}`);

    const response = await axios.get(audioUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const toMMSS = (ms) => {
      if (!ms) return '00:00';
      const [min, sec] = ms.split(':');
      return `${min.padStart(2, '0')}:${sec.padStart(2, '0')}`;
    };

    const durationFormatted = duration || '00:00';

    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n👤 *${channel}*\n⏳ *Duración:* ${durationFormatted}\n\n📎 URL: ${url}`,
        footer: 'Neoxr YouTube Downloader',
      }, { quoted: m });
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName,
      ptt: false,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    console.error('Error en descarga Neoxr:', error);
    await m.react('✖️');
    await m.reply('⚠️ Falla en la descarga, revisa la URL o intenta luego.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
