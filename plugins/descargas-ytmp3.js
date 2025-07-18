import axios from 'axios';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchDownloadUrl = async (videoUrl) => {
  const apis = [
    'https://api.vreden.my.id/api/ytmp3?url=',
    'https://mahiru-shiina.vercel.app/download/ytmp3?url=',
    'https://api.siputzx.my.id/api/d/ytmp3?url='
  ];

  for (let api of apis) {
    try {
      const fullUrl = `${api}${encodeURIComponent(videoUrl)}`;
      console.log(`[fetchDownloadUrl] Intentando con API: ${fullUrl}`);
      const { data } = await axios.get(fullUrl, { timeout: 10000 });
      console.log(`[fetchDownloadUrl] Respuesta de API:`, data);

      let result = data?.result || data?.data;
      const audioUrl = result?.download?.url || result?.dl_url || result?.download || result?.dl;
      const title = result?.metadata?.title || result?.title || "audio";

      if (audioUrl) {
        console.log(`[fetchDownloadUrl] Éxito! url encontrada: ${audioUrl}`);
        return {
          url: audioUrl.trim(),
          title
        };
      } else {
        console.log(`[fetchDownloadUrl] No se encontró url de audio en la respuesta`);
      }
    } catch (error) {
      console.error(`[fetchDownloadUrl] Error con API: ${api}`, error.message);
      await wait(5000);
    }
  }

  console.log(`[fetchDownloadUrl] No se pudo descargar desde ninguna API.`);
  return null;
};

const sendAudioWithRetry = async (conn, chat, audioUrl, videoTitle, maxRetries = 2) => {
  let attempt = 0;
  let thumbnailBuffer;
  try {
    console.log(`[sendAudioWithRetry] Descargando thumbnail...`);
    const response = await axios.get('https://files.catbox.moe/l81ahk.jpg', { responseType: 'arraybuffer' });
    thumbnailBuffer = Buffer.from(response.data, 'binary');
    console.log(`[sendAudioWithRetry] Thumbnail descargado exitosamente`);
  } catch (error) {
    console.error(`[sendAudioWithRetry] Error al obtener thumbnail:`, error.message);
  }

  let audioBuffer;

  try {
    console.log(`[sendAudioWithRetry] Descargando el archivo de audio desde ${audioUrl} ...`);
    // Intenta simular un navegador para evitar bloqueos por parte del CDN
    const audioResp = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://youtube.com/'
      }
    });
    audioBuffer = Buffer.from(audioResp.data, 'binary');
    console.log(`[sendAudioWithRetry] Audio descargado exitosamente (${audioBuffer.length} bytes)`);
  } catch (err) {
    console.error(`[sendAudioWithRetry] Error al descargar el audio:`, err.message);
    throw new Error('No se pudo descargar el audio para enviarlo.');
  }

  while (attempt < maxRetries) {
    try {
      console.log(`[sendAudioWithRetry] Enviando audio, intento #${attempt + 1}...`);
      await conn.sendMessage(
        chat,
        {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          fileName: (videoTitle || "audio") + ".mp3",
          contextInfo: {
            externalAdReply: {
              title: videoTitle,
              body: "Barboza hijueputa",
              previewType: 'PHOTO',
              thumbnail: thumbnailBuffer,
              mediaType: 1,
              renderLargerThumbnail: false,
              showAdAttribution: true,
              sourceUrl: 'https://Ella.Nunca.Te-Amo.Pe'
            }
          }
        }
      );
      console.log(`[sendAudioWithRetry] Audio enviado exitosamente`);
      return;
    } catch (error) {
      console.error(`[sendAudioWithRetry] Error al enviar audio, intento ${attempt + 1}:`, error.message);
      if (attempt < maxRetries - 1) {
        console.log('[sendAudioWithRetry] Esperando 12 segundos antes de reintentar...');
        await wait(12000);
      }
    }
    attempt++;
  }
  console.log(`[sendAudioWithRetry] Fallaron todos los intentos de enviar audio.`);
};

let handler = async (m, { conn, text }) => {
  console.log('[handler] Mensaje recibido:', text);
  if (!text?.trim() || (!text.includes('youtube.com') && !text.includes('youtu.be'))) {
    console.log('[handler] Enlace de YouTube inválido:', text);
    await conn.reply(m.chat, `❗ *Debes Ingresar Un Enlace De YouTube Válido.*`, m);
    return;
  }

  const reactionMessage = await conn.reply(m.chat, `🔍 *Procesando El Enlace 😉...*`, m);
  await conn.sendMessage(m.chat, { react: { text: '🎶', key: reactionMessage.key } });

  try {
    console.log('[handler] Llamando a fetchDownloadUrl con:', text);
    const downloadData = await fetchDownloadUrl(text);
    console.log('[handler] Resultado de fetchDownloadUrl:', downloadData);
    if (!downloadData || !downloadData.url) throw new Error("No Se Pudo Obtener La Descarga.");

    await conn.sendMessage(m.chat, { react: { text: '🟢', key: reactionMessage.key } });
    await sendAudioWithRetry(conn, m.chat, downloadData.url, downloadData.title);
  } catch (error) {
    console.error("[handler] ❌ Error:", error);
    await conn.reply(m.chat, `⚠️ *Error:* ${error.message || "Desconocido"}`, m);
  }
};

handler.help = ['ytmp3 <url de youtube>'];
handler.tags = ['descargas'];
handler.command = /^ytmp3$/i;

export default handler;
