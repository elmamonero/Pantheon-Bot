import yts from 'yt-search';

// Mapa global para controlar sesiones activas (por usuario)
const sesionesActivas = new Map();

const handler = async (m, { conn, args }) => {
  const userId = m.sender;

  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  // Invalida sesión anterior sin avisar
  if (sesionesActivas.has(userId)) {
    sesionesActivas.get(userId).cancelled = true;
    sesionesActivas.delete(userId);
  }

  // Nueva sesión activa
  const session = { cancelled: false };
  sesionesActivas.set(userId, session);

  // Determinar URL o buscar video
  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);
  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) {
      sesionesActivas.delete(userId);
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = searchResults.videos[0].url;
  }

  const videoInfo = await yts(url);
  const video = videoInfo.videos[0];
  if (!video) {
    sesionesActivas.delete(userId);
    return m.reply('No se pudo obtener información del video');
  }

  const infoText =
`🎬 *${video.title}*

📺 Canal: ${video.author.name || 'Desconocido'}
⏳ Duración: ${video.timestamp}
👁️ Vistas: ${video.views.toLocaleString()}

Responde con:
*1* para descargar Audio (usa comando ytmp3)
*2* para descargar Video (usa comando ytmp4)`;

  // Envía la pregunta y guarda el mensaje para referencia
  const sentMsg = await conn.reply(m.chat, infoText, m);

  try {
    // Tiempo muy largo para esperar (24 horas)
    const LONG_TIMEOUT = 86400000;

    while (true) {
      const response = await conn.waitMessage(m.chat, LONG_TIMEOUT, (msg) => {
        return (
          msg.quoted &&
          msg.quoted.id === sentMsg.id &&
          ['1', '2'].includes(msg.text?.trim()) &&
          msg.sender === userId
        );
      });

      // Si la sesión fue cancelada (nuevo comando usado), ignorar sin mensaje
      if (!sesionesActivas.has(userId) || sesionesActivas.get(userId).cancelled) {
        continue; // seguir esperando o cortar después del timeout largo
      }

      // Sesión válida: eliminar para evitar múltiples ejecuciones
      sesionesActivas.delete(userId);

      const choice = response.text.trim();

      if (choice === '1') {
        // Aquí simplemente guía o llama al comando ytmp3 externo si quieres
        await conn.sendMessage(m.chat, { text: `Has elegido descargar audio. Usa el comando:\n*ytmp3 ${url}*` }, { quoted: m });
        return;
      } else if (choice === '2') {
        // Aquí igual, guía o llama al comando ytmp4 externo
        await conn.sendMessage(m.chat, { text: `Has elegido descargar video. Usa el comando:\n*ytmp4 ${url}*` }, { quoted: m });
        return;
      } else {
        await m.reply('Respuesta no válida, cancela la operación.');
        return;
      }
    }
  } catch (e) {
    // Timeout (muy largo) o error, elimina sesión sin mensaje
    sesionesActivas.delete(userId);
    // No envía mensaje de tiempo agotado
    return;
  }
};

handler.command = ['play'];
handler.tags = ['descargas'];
handler.help = ['play <nombre|URL>'];

export default handler;
