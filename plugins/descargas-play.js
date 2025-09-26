import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const API_KEY = 'F0svKu'; // Tu API key de neoxr.eu
const DL_API = 'https://api.neoxr.eu/api/youtube';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de video YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    // Buscar video en YouTube si no es URL directa
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) return m.reply('No se encontraron resultados para tu búsqueda');
    url = searchResults.videos[0].url;
  }

  try {
    await m.react('🕒');

    // Construir URL con parámetros para API neoxr.eu
    const queryUrl = `${DL_API}?url=${encodeURIComponent(url)}&type=audio&quality=128kbps&apikey=${API_KEY}`;

    const { data } = await axios.get(queryUrl, { timeout: 30000 });

    if (!data.status || !data.data || !data.data.downloads || data.data.downloads.length === 0) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el mp3`);
    }

    // Buscar descarga con calidad 128 kbps
    const audioDownload = data.data.downloads.find(d => d.quality === '128kbps');
    if (!audioDownload) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se encontró descarga en 128kbps.`);
    }

    const { url: audioUrl } = audioDownload;
    const fileName = `${data.data.title || 'audio'}.mp3`.replace(/[\\/\s]/g, '_');

    // Descargar archivo mp3 al servidor
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);

    const response = await axios.get(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://youtube.com',
      },
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Enviar miniatura, info y el audio
    if (data.data.thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: data.data.thumbnail },
        caption: `🎵 *${data.data.title}*\n👤 *${data.data.channel}*\n⏳ *Duración:* ${data.data.duration}\n\n📎 URL: ${url}`,
        footer: 'Neoxr YouTube Downloader',
      }, { quoted: m });
    }

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');
  } catch (error) {
    console.error('Error al descargar mp3 neoxr:', error);
    await m.react('✖️');
    await m.reply('⚠️ La descarga ha fallado, posible error en la API o video muy pesado.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
