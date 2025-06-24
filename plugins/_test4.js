import yts from 'yt-search';
import fetch from 'node-fetch';
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';

// Define el texto del footer aquí
const club = '🤖 MiBot - Club Oficial';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) return conn.reply(
    m.chat,
    `*Por favor, ingresa un título de YouTube.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Corazón Serrano - Olvídalo Corazón`,
    m
  );

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
      const res = await fetch(video.miniatura);
      thumbnail = await res.buffer();
    } catch {
      // Imagen por defecto si falla la miniatura
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    }

    let messageText = `\`\`\`◜YouTube - Download◞\`\`\`\n\n`;
    messageText += `*${video.titulo}*\n\n`;
    messageText += `≡ *⏳ Duración* ${video.duracion || 'No disponible'}\n`;
    messageText += `≡ *🌴 Autor* ${video.canal || 'Desconocido'}\n`;
    messageText += `≡ *🌵 Url* ${video.url}\n`;

    // Opciones de YouTube adicionales
    const ytSections = searchResults.slice(1, 11).map((v, index) => ({
      title: `${index + 1}┃ ${v.titulo}`,
      rows: [
        {
          title: `🎶 Descargar MP3`,
          description: `Duración: ${v.duracion || 'No disponible'}`,
          id: `${usedPrefix}ytmp3 ${v.url}`
        },
        {
          title: `🎥 Descargar MP4`,
          description: `Duración: ${v.duracion || 'No disponible'}`,
          id: `${usedPrefix}ytmp4 ${v.url}`
        }
      ]
    }));

    // Opciones de Spotify
    const spotifySections = Array.isArray(spotifyResults) ? spotifyResults.slice(0, 10).map((s, index) => ({
      title: `${index + 1}┃ ${s.titulo}`,
      rows: [
        {
          title: `🎶 Descargar Audio`,
          description: `Duración: ${s.duracion || 'No disponible'}`,
          id: `${usedPrefix}spotify ${s.url}`
        }
      ]
    })) : [];

    await conn.sendMessage(m.chat, {
      image: thumbnail,
      caption: messageText,
      footer: club, // Aquí ya está definido
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      },
      buttons: [
        {
          buttonId: `${usedPrefix}ytmp3 ${video.url}`,
          buttonText: { displayText: '𝖠𝗎𝖽𝗂𝗈' },
          type: 1,
        },
        {
          buttonId: `${usedPrefix}ytmp4 ${video.url}`,
          buttonText: { displayText: '𝖵𝗂𝖽𝖾𝗈' },
          type: 1,
        },
        ...(ytSections.length > 0 ? [{
          type: 4,
          nativeFlowInfo: {
            name: 'single_select',
            paramsJson: JSON.stringify({
              title: '𝖱𝖾𝗌𝗎𝗅𝗍𝖺𝖽𝗈𝗌  𝖸𝗈𝗎𝖳𝗎𝖻𝖾',
              sections: ytSections,
            }),
          },
        }] : []),
        ...(spotifySections.length > 0 ? [{
          type: 4,
          nativeFlowInfo: {
            name: 'single_select',
            paramsJson: JSON.stringify({
              title: '𝖱𝖾𝗌𝗎𝗅𝗍𝖺𝖽1𝗈𝗌  𝖲𝗉𝗈𝗍𝗂𝖿𝗒',
              sections: spotifySections,
            }),
          },
        }] : [])
      ],
      headerType: 1,
      viewOnce: true
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error(e);
    await m.react('✖️');
    conn.reply(m.chat, '*`Error al buscar el video.`*\n' + e.message, m);
  }
};

handler.help = ['play <texto>'];
handler.tags = ['descargas'];
handler.command = ['play7'];
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
    console.error('Error en yt-search:', error.message);
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
    console.error('Error en Spotify API:', error.message);
    return [];
  }
}
