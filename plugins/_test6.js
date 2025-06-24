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
      const res = await fetch(video.miniatura);
      thumbnail = await res.buffer();
    } catch {
      const res = await fetch('https://telegra.ph/file/36f2a1bd2aaf902e4d1ff.jpg');
      thumbnail = await res.buffer();
    }

    let messageText = `\`\`\`◜YouTube - Download◞\`\`\`\n\n`;
    messageText += `*${video.titulo}*\n\n`;
    messageText += `≡ *⏳ Duración* ${video.duracion || 'No disponible'}\n`;
    messageText += `≡ *🌴 Autor* ${video.canal || 'Desconocido'}\n`;
    messageText += `≡ *🌵 Url* ${video.url}\n`;

    // Opciones YouTube para menú nativo (opcional)
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

    // Botones simples para Spotify simulando lista (máximo 10)
    const spotifyButtons = spotifyResults.slice(0, 10).map((s, i) => ({
      buttonId: `${usedPrefix}spotify ${s.url}`,
      buttonText: { displayText: `${i + 1}┃ ${s.titulo} (${s.duracion || 'No disponible'})` },
      type: 1,
    }));

    // Botones básicos para el video principal
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

    // Combina todos los botones (máximo 5 botones por mensaje es recomendable)
    // Por eso dividimos en grupos para enviar varios mensajes si hay muchos botones
    const allButtons = [...mainButtons, ...spotifyButtons];

    // WhatsApp limita a 5 botones por mensaje, así que enviamos en lotes de 5
    const chunkSize = 5;
    for (let i = 0; i < allButtons.length; i += chunkSize) {
      const buttonsChunk = allButtons.slice(i, i + chunkSize);
      await conn.sendMessage(m.chat, {
        image: i === 0 ? thumbnail : undefined,
        caption: i === 0 ? messageText : undefined,
        footer: club,
        buttons: buttonsChunk,
        headerType: i === 0 ? 4 : 1,
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true
        }
      }, { quoted: m });
    }

    await m.react('✅');
  } catch (e) {
    console.error(e);
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
