import yts from 'yt-search';
import fetch from 'node-fetch';

const club = '🤖 MiBot - Club Oficial';

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
    const spotifyResults = await searchSpotify(query);

    if (!searchResults.length && !spotifyResults.length) {
      throw new Error('*✖️ No se encontraron resultados.*');
    }

    const video = searchResults[0];

    let thumbnail;
    try {
      if (!video.miniatura) throw new Error('Miniatura no disponible');
      const res = await fetch(video.miniatura);
      if (!res.ok) throw new Error('Error al descargar miniatura');
      thumbnail = await res.buffer();
    } catch {
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    }

    if (!thumbnail || thumbnail.length === 0) {
      throw new Error('Miniatura inválida o vacía');
    }

    // Construir el texto con saltos de línea explícitos
    let messageText = '◜YouTube - Download◞\n\n';
    messageText += `*${video.titulo}*\n\n`;
    messageText += `≡ ⏳ Duración: ${video.duracion || 'No disponible'}\n`;
    messageText += `≡ 🌴 Autor: ${video.canal || 'Desconocido'}\n`;
    messageText += `≡ 🌵 Url: ${video.url}\n`;

    // Botones para YouTube y Spotify
    const spotifyButtons = spotifyResults.slice(0, 3).map((s, i) => ({
      buttonId: `${usedPrefix}spotify ${s.url}`,
      buttonText: { displayText: `Spotify ${i + 1}` },
      type: 1,
    }));

    const mainButtons = [
      {
        buttonId: `${usedPrefix}ytmp3 ${video.url}`,
        buttonText: { displayText: '𝖠𝗎𝖽𝗂𝗈' },
        type: 1,
      },
      {
        buttonId: `${usedPrefix}ytmp4 ${video.url}`,
        buttonText: { displayText: '𝖵𝗂𝖽𝖾𝗈' },
        type: 1,
      }
    ];

    const buttons = [...mainButtons, ...spotifyButtons];

    await conn.sendMessage(m.chat, {
      image: thumbnail,
      caption: messageText,
      footer: club,
      buttons,
      headerType: 4, // 4 = imagen con botones
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      }
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error('[play] Error:', e);
    await m.react('✖️');
    conn.reply(m.chat, '*`Error al buscar el video.`*\n' + e.message, m);
  }
};

handler.help = ['play <texto>'];
handler.tags = ['descargas'];
handler.command = ['play'];

export default handler;

// Función para buscar videos en YouTube
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
    console.error('[searchVideos] Error:', error);
    return [];
  }
}

// Función para buscar canciones en Spotify
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
    console.error('[searchSpotify] Error:', error);
    return [];
  }
}
