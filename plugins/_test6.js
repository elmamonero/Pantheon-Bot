import yts from 'yt-search';
import fetch from 'node-fetch';
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const club = '🤖 MiBot - Club Oficial';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  console.log('[Handler] Comando recibido:', command, 'Args:', args);

  if (!args[0]) {
    console.log('[Handler] No se ingresó título');
    return conn.reply(
      m.chat,
      `*Por favor, ingresa un título de YouTube.*\n> *\`Ejemplo:\`* ${usedPrefix + command} Corazón Serrano - Olvídalo Corazón`,
      m
    );
  }

  await m.react('🕒');
  try {
    const query = args.join(" ");
    console.log('[Handler] Buscando videos para:', query);

    const searchResults = await searchVideos(query);
    console.log('[Handler] Resultados YouTube:', searchResults.length, searchResults);

    const spotifyResults = await searchSpotify(query);
    console.log('[Handler] Resultados Spotify:', spotifyResults.length, spotifyResults);

    if (!searchResults.length && !spotifyResults.length) {
      throw new Error('*✖️ No se encontraron resultados.*');
    }

    const video = searchResults[0];
    console.log('[Handler] Video seleccionado:', video);

    let thumbnail;
    try {
      console.log('[Handler] Descargando miniatura:', video.miniatura);
      const res = await fetch(video.miniatura);
      thumbnail = await res.buffer();
      console.log('[Handler] Miniatura descargada correctamente');
    } catch (err) {
      console.error('[Handler] Error al descargar miniatura:', err.message);
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
      console.log('[Handler] Miniatura por defecto usada');
    }

    let messageText = `\`\`\`◜YouTube - Download◞\`\`\`\n\n`;
    messageText += `*${video.titulo}*\n\n`;
    messageText += `≡ *⏳ Duración* ${video.duracion || 'No disponible'}\n`;
    messageText += `≡ *🌴 Autor* ${video.canal || 'Desconocido'}\n`;
    messageText += `≡ *🌵 Url* ${video.url}\n`;

    // Opciones de YouTube adicionales para menú nativo
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
    console.log('[Handler] Secciones YouTube para menú:', ytSections.length);

    // Botones simples para Spotify (máximo 3 para no saturar)
    const spotifyButtons = spotifyResults.slice(0, 3).map((s, i) => ({
      buttonId: `${usedPrefix}spotify ${s.url}`,
      buttonText: { displayText: `Spotify ${i + 1}` },
      type: 1,
    }));
    console.log('[Handler] Botones Spotify creados:', spotifyButtons.length);

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
        ...spotifyButtons
      ],
      // Menú nativo solo para YouTube (opcional)
      ...(ytSections.length > 0 ? {
        footer: club,
        headerType: 1,
        viewOnce: true,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: '𝖱𝖾𝗌𝗎𝗅𝗍𝖺𝖽𝗈𝗌  𝖸𝗈𝗎𝖳𝗎𝖻𝖾',
            sections: ytSections,
          }),
        },
        type: 4,
      } : {}),
    }, { quoted: m });

    await m.react('✅');
    console.log('[Handler] Mensaje enviado con éxito');
  } catch (e) {
    console.error('[Handler] Error en el comando:', e);
    await m.react('✖️');
    conn.reply(m.chat, '*`Error al buscar el video.`*\n' + e.message, m);
  }
};

handler.help = ['play <texto>'];
handler.tags = ['descargas'];
handler.command = ['play6'];
export default handler;

// Función para buscar videos en YouTube
async function searchVideos(query) {
  console.log('[searchVideos] Buscando:', query);
  try {
    const res = await yts(query);
    console.log('[searchVideos] Resultados:', res.videos.length);
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
    console.error('[searchVideos] Error en yt-search:', error.message);
    return [];
  }
}

// Función para buscar canciones en Spotify
async function searchSpotify(query) {
  console.log('[searchSpotify] Buscando:', query);
  try {
    const res = await fetch(`https://delirius-apiofc.vercel.app/search/spotify?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) {
      console.log('[searchSpotify] Respuesta inválida:', data);
      return [];
    }
    console.log('[searchSpotify] Resultados:', data.data.length);
    return data.data.slice(0, 10).map(track => ({
      titulo: track.title,
      url: track.url,
      duracion: track.duration || 'No disponible'
    }));
  } catch (error) {
    console.error('[searchSpotify] Error en Spotify API:', error.message);
    return [];
  }
}
