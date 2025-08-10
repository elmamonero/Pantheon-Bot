import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  let isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) {
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = searchResults.videos[0].url;
  }

  try {
    await m.react('🕒');

    const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);

    if (!data.result?.download?.status) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No se pudo obtener el mp3');
    }

    const title = data.result.metadata.title || 'audio';
    const audioUrl = data.result.download.url;
    const fileName = data.result.download.filename || `${title}.mp3`;
    const thumbnail = data.result.metadata.thumbnail || data.result.metadata.image;

    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);
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

    // Enviamos la imagen, título y URL
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `🎵 *${title}*\n\n📎 URL: ${url}\n\nDescarga MP3 desde YouTube`,
      footer: 'Pantheon Bot',
      contextInfo: {
        externalAdReply: {
          title,
          body: 'Descargar MP3 de YouTube',
          thumbnailUrl: thumbnail,
          mediaUrl: url,
        },
      },
    }, { quoted: m });

    // Enviamos el audio descargado
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');
  } catch (e) {
    console.error('Error al descargar MP3:', e, e.response?.data);
    await m.react('✖️');
    m.reply('⚠️ La descarga ha fallado, posible error en la API o video muy pesado.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
