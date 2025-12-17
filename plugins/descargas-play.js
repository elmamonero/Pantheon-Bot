import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL válido de YouTube');

  let query = args.join(' ');
  let url = query;

  // Si no es URL, buscar en YouTube
  if (!/(youtube\.com|youtu\.be)/.test(query)) {
    const search = await yts(query);
    if (!search.videos.length) return m.reply('No encontré resultados');
    url = search.videos[0].url;
  }

  try {
    await m.react('🕒');

    // Llamada a la API Delirius
    const apiUrl = `https://delirius-apiofc.vercel.app/download/ytmp3?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });

    if (!data.status || !data.data || !data.data.download?.url) {
      await m.react('✖️');
      return m.reply('✖️ Error: La API no devolvió un enlace de descarga.');
    }

    const info = data.data;
    const audioUrl = info.download.url;
    const title = info.title || 'audio';
    const thumbnail = info.image;
    const author = info.author || 'Desconocido';
    const duration = info.duration || '00:00';

    const fileName = `${title}.mp3`.replace(/[\\/:*?"<>|]/g, '_');
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);

    // Descargar el MP3
    const response = await axios.get(audioUrl, {
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Enviar portada
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `🎵 *${title}*\n👤 *${author}*\n⏳ *Duración:* ${duration}s\n📎 URL: ${url}`,
    }, { quoted: m });

    // Enviar audio
    await conn.sendMessage(m.chat, {
      audio: { url: dest },
      mimetype: 'audio/mpeg',
      fileName,
      ptt: false,
    }, { quoted: m });

    fs.unlinkSync(dest);
    await m.react('✅');

  } catch (e) {
    console.error('Error en descarga Delirius:', e);
    await m.react('✖️');
    m.reply('⚠️ Error descargando el audio. Intenta más tarde.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
