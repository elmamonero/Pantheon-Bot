import yts from 'yt-search';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';

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

    // Obtener información del video
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const thumbnail = info.videoDetails.thumbnails.pop().url;
    const author = info.videoDetails.author.name;
    const duration = info.videoDetails.lengthSeconds;

    const fileName = `${title}.mp3`.replace(/[\\/:*?"<>|]/g, '_');
    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);

    // Descargar audio directamente desde YouTube
    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio'
    });

    const writer = fs.createWriteStream(dest);
    stream.pipe(writer);

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
    console.error('Error en descarga:', e);
    await m.react('✖️');
    m.reply('⚠️ Error descargando el audio. Intenta más tarde.');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
