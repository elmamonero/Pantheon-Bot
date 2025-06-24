import yts from 'yt-search';
import fetch from 'node-fetch';

const xdownload = '⬇️'; // Emoji o texto para el prompt
const club = 'Bot de Descargas'; // Footer personalizado

async function searchYoutube(query) {
  try {
    const res = await yts(query);
    if (!res || !res.videos.length) return [];
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
    console.error('Error en búsqueda YouTube:', error);
    return [];
  }
}

async function searchSpotify(query) {
  try {
    const url = `https://delirius-apiofc.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return [];
    return data.data.slice(0, 10).map(track => ({
      titulo: track.title,
      url: track.url,
      duracion: track.duration || 'No disponible'
    }));
  } catch (error) {
    console.error('Error en búsqueda Spotify:', error);
    return [];
  }
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args.length) {
    return conn.reply(
      m.chat,
      `*${xdownload} Por favor, ingresa un título para buscar.*\nEjemplo: ${usedPrefix + command} Corazón Serrano - Olvídalo Corazón`,
      m
    );
  }

  await m.react('🕒'); // Reacción de reloj indicando proceso

  const query = args.join(' ');

  try {
    // Buscar en YouTube y Spotify simultáneamente
    const [ytResults, spotifyResults] = await Promise.all([
      searchYoutube(query),
      searchSpotify(query)
    ]);

    if (ytResults.length === 0 && spotifyResults.length === 0) {
      throw new Error('No se encontraron resultados en YouTube ni Spotify.');
    }

    // Priorizar mostrar resultado de YouTube si existe, sino Spotify
    const mainVideo = ytResults[0] || null;
    const mainSpotify = !mainVideo && spotifyResults.length ? spotifyResults[0] : null;

    // Preparar thumbnail (usar imagen por defecto si no hay)
    let thumbnailBuffer = null;
    if (mainVideo) {
      try {
        const res = await fetch(mainVideo.miniatura);
        thumbnailBuffer = await res.buffer();
      } catch {
        try {
          const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
          thumbnailBuffer = await res.buffer();
        } catch {
          thumbnailBuffer = null;
        }
      }
    } else {
      // Imagen genérica para Spotify
      try {
        const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
        thumbnailBuffer = await res.buffer();
      } catch {
        thumbnailBuffer = null;
      }
    }

    // Construir texto del mensaje
    let caption = '';

    if (mainVideo) {
      caption += `*${mainVideo.titulo}*\n\n`;
      caption += `≡ ⏳ Duración: ${mainVideo.duracion}\n`;
      caption += `≡ 🌴 Canal: ${mainVideo.canal}\n`;
      caption += `≡ 🌐 URL: ${mainVideo.url}\n\n`;
    } else if (mainSpotify) {
      caption += `*${mainSpotify.titulo}*\n\n`;
      caption += `≡ ⏳ Duración: ${mainSpotify.duracion}\n`;
      caption += `≡ 🌐 URL: ${mainSpotify.url}\n\n`;
    }

    // Crear botones para descarga o acciones
    const buttons = [];

    if (mainVideo) {
      buttons.push(
        {
          buttonId: `${usedPrefix}ytmp3 ${mainVideo.url}`,
          buttonText: { displayText: '🎵 Audio' },
          type: 1
        },
        {
          buttonId: `${usedPrefix}ytmp4 ${mainVideo.url}`,
          buttonText: { displayText: '🎥 Video' },
          type: 1
        }
      );
    } else if (mainSpotify) {
      buttons.push({
        buttonId: `${usedPrefix}spotify ${mainSpotify.url}`,
        buttonText: { displayText: '🎵 Descargar Spotify' },
        type: 1
      });
    }

    // Preparar contenido del mensaje
    const messageContent = {
      caption,
      footer: club,
      buttons,
      headerType: 1,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true
      }
    };

    // Solo agregar imagen si el buffer es válido
    if (thumbnailBuffer && Buffer.isBuffer(thumbnailBuffer)) {
      messageContent.image = { buffer: thumbnailBuffer };
    }

    // Enviar mensaje
    await conn.sendMessage(m.chat, messageContent, { quoted: m });

    await m.react('✅'); // Confirmación de éxito
  } catch (error) {
    console.error('Error en comando play:', error);
    await m.react('✖️');
    conn.reply(m.chat, `*Error:* ${error.message}`, m);
  }
};

handler.help = ['play <texto>'];
handler.tags = ['dl'];
handler.command = ['play', 'playtest'];

export default handler;
