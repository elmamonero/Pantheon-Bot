import yts from 'yt-search';

const MAX_SIZE_MB = 100; // Solo para mostrar info, ya no descargamos al servidor
const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  try {
    await m.react('🕒');

    // 1. Buscar info del video
    const searchQuery = args.join(' ');
    const searchResult = await yts(searchQuery); // Busca por texto o URL [web:21]
    const video = searchResult.videos[0];

    if (!video) {
      await m.react('✖️');
      return m.reply('No se encontraron resultados.');
    }

    const { title, thumbnail, timestamp, url } = video;

    // 2. Llamada a la API de Stellarwa (Video)
    const apiUrl = `https://api.stellarwa.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&quality=360&key=GataDios`;
    const apiResponse = await fetch(apiUrl);
    const json = await apiResponse.json();

    if (!json.status || !json.data || !json.data.dl) {
      await m.react('✖️');
      return m.reply('*✖️ Error:* La API no devolvió un enlace de descarga válido.');
    }

    const videoUrl = json.data.dl; // Enlace redirector.googlevideo.com [web:26]

    // (Opcional) Si la API diera tamaño, podrías mostrarlo aquí
    // const sizeMB = ...; // No lo calculamos porque no descargamos al servidor

    // 3. Enviar Miniatura e Info
    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption:
        `🎵 *${title}*\n` +
        `⏱️ ${timestamp}\n` +
        `📎 ${url}\n` +
        `💾 Límite aprox: ${MAX_SIZE_MB}MB\n\n` +
        `*Pantheon Bot*`,
    }, { quoted: m });

    // 4. Enviar el Video usando la URL directa (sin axios ni fs)
    await conn.sendMessage(m.chat, {
      video: { url: videoUrl }, // WhatsApp descarga directo desde YouTube CDN [web:22]
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
      caption: `✅ Aquí tienes tu video.`,
    }, { quoted: m });

    await m.react('✅');

  } catch (error) {
    console.error('Error en play2/ytmp4:', error);
    await m.react('✖️');
    m.reply(`⚠️ Falló la descarga.\n\n*Detalle:* ${error.message}`);
  }
};

handler.help = ['play2 <nombre|URL>', 'ytmp4 <nombre|URL>'];
handler.command = ['play2', 'ytmp4'];
handler.tags = ['descargas'];

export default handler;
