import yts from 'yt-search';
import fetch from 'node-fetch';
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const club = 'Pantheon Bot';

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
    let thumbnail;
    try {
      const res = await fetch(video.miniatura || 'https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    } catch {
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    }

    let messageText = `\`\`\`◜YouTube - Download◞\`\`\`\n\n`;
    messageText += `*${video.titulo || query}*\n\n`;
    messageText += `≡ *⏳ Duración* ${video.duracion || 'No disponible'}\n`;
    messageText += `≡ *🌴 Autor* ${video.canal || 'Desconocido'}\n`;
    messageText += `≡ *🌵 Url* ${video.url || 'No disponible'}\n`;

    // Botones rápidos de Spotify
    const spotifyButtons = spotifyResults.slice(0, 1).map((s, i) => ({
      buttonId: `${usedPrefix}spotify ${s.url}`,
      buttonText: { displayText: `🎵 ${s.titulo.slice(0, 25)}` },
      type: 1,
    }));

    // Sección combinada
    const sections = [];

    if (searchResults.length > 1) {
      const ytRows = searchResults.slice(1, 10).flatMap((v, i) => ([
        {
          title: `${i + 1}┃ ${v.titulo} (MP3)`,
          description: `Audio - Duración: ${v.duracion || 'ND'}`,
          id: `${usedPrefix}ytmp3 ${v.url}`
        },
        {
          title: `${i + 1}┃ ${v.titulo} (MP4)`,
          description: `Video - Duración: ${v.duracion || 'ND'}`,
          id: `${usedPrefix}ytmp4 ${v.url}`
        }
      ]));
      sections.push({ title: '📺 YouTube - Resultados', rows: ytRows });
    }

    if (spotifyResults.length > 0) {
      const spRows = spotifyResults.slice(0, 10).map((s, i) => ({
        title: `${i + 1}┃ ${s.titulo}`,
        description: `Duración: ${s.duracion || 'ND'}`,
        id: `${usedPrefix}spotify ${s.url}`
      }));
      sections.push({ title: '🎧 Spotify - Resultados', rows: spRows });
    }

    await conn.sendMessage(m.chat, {
      image: thumbnail,
      caption: messageText,
      footer: club,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      },
      buttons: [
        ...(video.url ? [
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
        ] : []),
        ...spotifyButtons
      ],
      ...(sections.length > 0 ? {
        headerType: 1,
        viewOnce: true,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: '📥 Resultados YouTube + Spotify',
            sections: sections,
          }),
        },
        type: 4,
      } : {}),
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

// Buscar canciones en Spotify
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
  } catch {
    return [];
  }
}
