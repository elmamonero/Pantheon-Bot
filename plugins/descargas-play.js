import yts from 'yt-search';
import ytdl from 'ytdl-core';
import fetch from 'node-fetch';

const club = 'Pantheon Bot';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(
      m.chat,
      `*Por favor, ingresa un título de YouTube.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Corazón Serrano - Olvídalo Corazón`,
      m
    );
  }

  await m.react('🕒');

  try {
    const query = args.join(" ");
    const searchResults = await searchVideos(query);

    if (!searchResults.length) {
      throw new Error('*✖️ No se encontraron resultados.*');
    }

    const video = searchResults[0] || {};

    // Descarga la miniatura
    let thumbnail;
    try {
      const res = await fetch(video.miniatura || 'https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    } catch {
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    }

    // Texto del mensaje
    let messageText = `\`\`\`◜YouTube - Download MP3◞\`\`\`\n\n`;
    messageText += `*${video.titulo || query}*\n\n`;
    messageText += `≡ *⏳ Duración* ${video.duracion || 'No disponible'}\n`;
    messageText += `≡ *🌴 Autor* ${video.canal || 'Desconocido'}\n`;
    messageText += `≡ *🌵 Url* ${video.url || 'No disponible'}\n`;

    // Descargar el audio en formato MP3 con ytdl-core (bajando solo audio)
    const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });

    // Enviar primero la imagen con datos
    await conn.sendMessage(m.chat, {
      image: thumbnail,
      caption: messageText,
      footer: club,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      }
    }, { quoted: m });

    // Luego enviar el audio en formato audio para que quede como nota de voz o audio normal
    await conn.sendMessage(m.chat, {
      audio: stream,
      mimetype: 'audio/mpeg',
      ptt: false, // false para audio normal, true para nota de voz
      fileName: `${video.titulo}.mp3`
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    await m.react('✖️');
    conn.reply(m.chat, '*`Error al procesar tu solicitud.`*\n' + e.message, m);
  }
};

handler.help = ['play <texto>'];
handler.tags = ['descargas'];
handler.command = ['play'];
export default handler;

// Buscar videos en YouTube
async function searchVideos(query) {
  try {
    const res = await yts(query);
    return res.videos.slice(0, 10).map(video => ({
      titulo: video.title,
      url: video.url,
      miniatura: video.thumbnail,
      canal: video.author.name,
      publicado: video.timestamp || 'No disponible',
      vistas: video.views || 'No disponible',
      duracion: video.duration?.timestamp || 'No disponible'
    }));
  } catch {
    return [];
  }
}
