import yts from 'yt-search';
import fetch from 'node-fetch';

const club = '🤖 MiBot - Club Oficial';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(
      m.chat,
      `*Por favor, ingresa un título de YouTube o Spotify.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Corazón Serrano - Olvídalo Corazón`,
      m
    );
  }

  await m.react('🕒');

  try {
    const query = args.join(" ");
    const searchResults = await searchVideos(query);
    const spotifyResults = await searchSpotify(query);

    if (!searchResults.length && !spotifyResults.length) {
      throw new Error('*✖️ No se encontraron resultados.*');
    }

    const video = searchResults[0] || {};
    const spotifyTrack = spotifyResults[0] || {};

    let thumbnail;
    try {
      const res = await fetch(video.miniatura || 'https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    } catch {
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    }

    const messageText = [
      '```◜YouTube - Download◞```',
      '',
      `*${video.titulo || query}*`,
      '',
      `≡ *⏳ Duración* ${video.duracion || 'No disponible'}`,
      `≡ *🌴 Autor* ${video.canal || 'Desconocido'}`,
      `≡ *🌵 Url* ${video.url || 'No disponible'}`,
    ].join('\n');

    const buttons = [];

    if (video.url) {
      buttons.push(
        {
          buttonId: `${usedPrefix}ytmp3 ${video.url}`,
          buttonText: { displayText: '𝖠𝗎𝖽𝗂𝗈 🎧' },
          type: 1,
        },
        {
          buttonId: `${usedPrefix}ytmp4 ${video.url}`,
          buttonText: { displayText: '𝖵𝗂𝖽𝖾𝗈 📹' },
          type: 1,
        }
      );
    }

    if (spotifyTrack.url) {
      buttons.push({
        buttonId: `${usedPrefix}spotify ${spotifyTrack.url}`,
        buttonText: { displayText: '𝖲𝗉𝗈𝗍𝗂𝖿𝗒 🎵' },
        type: 1,
      });
    }

    await conn.sendMessage(m.chat, {
      image: thumbnail,
      caption: messageText,
      footer: club,
      buttons,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 1000,
        isForwarded: true
      },
      headerType: 1
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error('[Handler] Error:', e);
    await m.react('✖️');
    conn.reply(m.chat, '*`Error al procesar tu solicitud.`*\n' + e.message, m);
  }
};

handler.help = ['play7 <texto>'];
handler.tags = ['descargas'];
handler.command = ['play7'];
export default handler;

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
  } catch (error) {
    console.error('[YouTube] Error:', error.message);
    return [];
  }
}

async function searchSpotify(query) {
  try {
    const res = await fetch(`https://delirius-apiofc.vercel.app/search/spotify?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return [];
    return data.data.slice(0, 10).map(track => ({
      titulo: track.title,
      url: track.url,
      duracion: track.duration || 'No disponible'
    }));
  } catch (error) {
    console.error('[Spotify] Error:', error.message);
    return [];
  }
}
