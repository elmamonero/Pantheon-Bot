import axios from 'axios';
import fs from 'fs';
import path from 'path';

const api = `https://api.siputzx.my.id/api/s/youtube`;

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL válido de YouTube');

  let query = args.join(' ');

  try {
    await m.react('🕒');

    // Petición a la API Siputzx
    let data;
    try {
      const res = await axios.get(`${api}?query=${encodeURIComponent(query)}`, {
        timeout: 60000 // 60 segundos
      });
      data = res.data;
    } catch (e) {
      await m.react('✖️');
      return m.reply('⚠️ La API tardó demasiado en responder. Intenta otra búsqueda o más tarde.');
    }

    if (!data.status || !data.data || !data.data.url) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* No se pudo obtener el mp3');
    }

    const { title, thumbnail, channel, duration, url: audioUrl } = data.data;

    const fileName = `${title || 'audio'}.mp3`.replace(/[\\/:*?"<>|]/g, '_');
    const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/\s/g, '_')}`);

    // Descargar el audio
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

    const durationFormatted = duration || '00:00';

    // Enviar portada
    if (thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n👤 *${channel}*\n⏳ *Duración:* ${durationFormatted}\n\n🔍 Búsqueda: ${query}`,
        footer: 'Siputzx YouTube Downloader',
      }, { quoted: m });
    }

    // Enviar audio
    await conn.sendMessage(m.chat, {
      audio: { url: dest },
      mimetype: 'audio/mpeg',
      fileName: fileName,
      ptt: false,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    console.error('Error en descarga Siputzx:', error);
    await m.react('✖️');
    await m.reply('⚠️ Falla en la descarga, revisa la búsqueda o intenta luego.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
