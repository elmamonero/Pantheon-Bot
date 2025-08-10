import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
import fetch from 'node-fetch';

// Mapa para controlar sesiones activas de comando por usuario
const sesionesActivas = new Map();

/**
 * Función para esperar un mensaje que pase filtro, sin timeout (o con timeout opcional).
 * Funciona con Baileys (conexión en conn.ws).
 * 
 * @param {object} conn - Conexión Baileys
 * @param {string} chatId - ID del chat donde esperar
 * @param {function} filtro - Función que recibe el mensaje y devuelve true si es válido
 * @param {number} timeout - Tiempo en ms para esperar (opcional), 0 o undefined = sin timeout
 * @returns {Promise<object>} - Promise para el mensaje recibido que pasa filtro
 */
function waitMessage(conn, chatId, filtro, timeout = 0) {
  return new Promise((resolve, reject) => {
    const onMessage = async (messageUpsert) => {
      if (!messageUpsert.messages || !messageUpsert.messages[0]) return;
      const message = messageUpsert.messages[0];
      if (!message.key.remoteJid || message.key.remoteJid !== chatId) return;

      if (filtro(message)) {
        conn.ws.off('messages.upsert', onMessage);
        resolve(message);
      }
    };

    conn.ws.on('messages.upsert', onMessage);

    if (timeout && timeout > 0) {
      setTimeout(() => {
        conn.ws.off('messages.upsert', onMessage);
        reject(new Error('timeout'));
      }, timeout);
    }
  });
}

const handler = async (m, { conn, args }) => {
  const userId = m.sender;

  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  // Invalida sesiones anteriores sin avisar
  if (sesionesActivas.has(userId)) {
    sesionesActivas.get(userId).cancelled = true;
    sesionesActivas.delete(userId);
  }
  
  // Nueva sesión activa
  const session = { cancelled: false };
  sesionesActivas.set(userId, session);

  // Detectar URL o hacer búsqueda
  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);
  if (!isUrl) {
    const busqueda = await yts(args.join(' '));
    if (!busqueda.videos.length) {
      sesionesActivas.delete(userId);
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = busqueda.videos[0].url;
  }

  // Obtener info del video
  const info = await yts(url);
  const video = info.videos[0];
  if (!video) {
    sesionesActivas.delete(userId);
    return m.reply('No se pudo obtener información del video');
  }

  // Preparar texto con info y opciones
  const infoText =
`🎬 *${video.title}*

📺 Canal: ${video.author.name || 'Desconocido'}
⏳ Duración: ${video.timestamp}
👁️ Vistas: ${video.views.toLocaleString()}

Responde *al mensaje* con:
*1* para descargar Audio
*2* para descargar Video`;

  // Enviar mensaje con info y guardar referencia
  const sentMsg = await conn.reply(m.chat, infoText, m);

  try {
    // Esperar indefinidamente (timeout=0)
    while (true) {
      const response = await waitMessage(conn, m.chat, msg => {
        if (!msg.message) return false;
        // Comprobar que es respuesta al mensaje enviado y texto válido
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return false;

        const quotedId = msg.message.extendedTextMessage.contextInfo.stanzaId || msg.message.extendedTextMessage.contextInfo.stanzaId || msg.message.extendedTextMessage.contextInfo.stanzaId;

        // Para Baileys v4+ el id de mensaje suele ser msg.key.id, lo usamos para comparar
        const isReplyToSent = msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.id || msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id || msg.key.id === sentMsg.key.id;

        const textMsg = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        return (
          msg.key.remoteJid === m.chat &&
          isReplyToSent &&
          ['1', '2'].includes(textMsg.trim()) &&
          msg.key.participant === userId // que el mensaje sea del autor actual
        );
      }, 0); // timeout 0 para esperar indefinidamente

      // Verificar que la sesión sigue activa para el usuario
      if (!sesionesActivas.has(userId) || sesionesActivas.get(userId).cancelled) {
        // Sesión cancelada, ignorar este mensaje y seguir esperando
        continue;
      }

      // Sesión activa, eliminar y proceder
      sesionesActivas.delete(userId);

      const choice = response.message.conversation || response.message.extendedTextMessage.text;
      const opcion = choice.trim();

      if (opcion === '1') {
        // DESCARGAR AUDIO
        await m.react('🕒');

        const { data } = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(url)}`);

        if (!data.result?.download?.status) {
          await m.react('✖️');
          return m.reply('*✖️ Error:* No se pudo obtener el mp3');
        }

        const title = data.result.metadata.title || 'audio';
        const audioUrl = data.result.download.url;
        const fileName = data.result.download.filename || `${title}.mp3`;
        const thumbnail = data.result.metadata.thumbnail || data.result.metadata.image;

        const dest = path.join('/tmp', `${Date.now()}_${fileName.replace(/[\\/\s]/g, '_')}`);
        const responseStream = await axios.get(audioUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://youtube.com',
          },
          responseType: 'stream',
        });
        const writer = fs.createWriteStream(dest);
        responseStream.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Enviar imagen con info
        await conn.sendMessage(m.chat, {
          image: { url: thumbnail },
          caption: `🎵 *${title}*\n\n📎 URL: ${url}\n\nDescarga MP3 desde YouTube`,
          footer: 'Pantheon Bot',
          contextInfo: {
            externalAdReply: {
              title,
              body: 'Descargar MP3 de YouTube',
              thumbnailUrl: thumbnail,
              mediaUrl: url,
            },
          },
        }, { quoted: m });

        // Enviar el audio
        await conn.sendMessage(m.chat, {
          audio: fs.readFileSync(dest),
          mimetype: 'audio/mpeg',
          fileName,
        }, { quoted: m });

        fs.unlinkSync(dest);
        await m.react('✅');
        return;
      } else if (opcion === '2') {
        // DESCARGAR VIDEO
        await m.react('🕒');

        const apiKey = 'sylphy-eab7';
        const apiUrl = `https://api.sylphy.xyz/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${apiKey}`;

        const resp = await fetch(apiUrl);
        if (!resp.ok) {
          await m.react('✖️');
          return m.reply('✖️ Error al obtener el video.');
        }

        const json = await resp.json();

        if (!json.res || !json.res.url) {
          await m.react('✖️');
          return m.reply('✖️ No se pudo obtener el enlace del video para descargar.');
        }

        await conn.sendFile(
          m.chat,
          json.res.url,
          `${json.res.title || video.title}.mp4`,
          video.title,
          m
        );

        await m.react('✅');
        return;
      } else {
        await m.reply('Respuesta no válida, operación cancelada.');
        return;
      }
    }
  } catch (e) {
    sesionesActivas.delete(userId);
    // No enviar mensaje de timeout para no molestar
    return;
  }
};

handler.command = ['play'];
handler.tags = ['descargas'];
handler.help = ['play <nombre|URL>'];

export default handler;
