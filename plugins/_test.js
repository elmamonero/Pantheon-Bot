import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handler = async (msg, { conn, command }) => {
  const chatId = msg.key.remoteJid;
  const pref = global.prefixes?.[0] || ".";

  // Para ejecutar con la imagen enviada directamente (no sólo con mensaje citado):
  // Si el mensaje tiene media directo y no es texto, permitir procesar esa media.
  // Si hay mensaje citado con media, usar ese.
  let mediaMessage = null;
  let typeDetected = null;

  // Comprobar si mensaje citado con media
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  // Función local para detectar tipo y obtener mediaMessage
  function detectMediaType(message) {
    if (!message) return { type: null, media: null };
    if (message.imageMessage) return { type: 'image', media: message.imageMessage };
    if (message.videoMessage) return { type: 'video', media: message.videoMessage };
    if (message.stickerMessage) return { type: 'sticker', media: message.stickerMessage };
    if (message.audioMessage) return { type: 'audio', media: message.audioMessage };
    return { type: null, media: null };
  }

  if (quoted) {
    // Si hay mensaje citado, usarlo
    ({ type: typeDetected, media: mediaMessage } = detectMediaType(quoted));
  } else {
    // Si no hay mensaje citado, intentar detectar media directo en mensaje principal
    const messageContent = Object.values(msg.message || {}).find(
      v =>
        typeof v === 'object' &&
        (v.imageMessage || v.videoMessage || v.stickerMessage || v.audioMessage)
    );

    ({ type: typeDetected, media: mediaMessage } = detectMediaType(messageContent));
  }

  if (!mediaMessage || !typeDetected) {
    return conn.sendMessage(chatId, {
      text: `✳️ *Usa:*\n${pref}${command}\n📌 Responde o envía una imagen, video, sticker o audio para subirlo.`
    }, { quoted: msg });
  }

  await conn.sendMessage(chatId, {
    react: { text: '☁️', key: msg.key }
  });

  try {
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const rawExt = typeDetected === 'sticker' ? 'webp' :
      mediaMessage.mimetype ? mediaMessage.mimetype.split('/')[1].split(';')[0] : 'bin';

    const rawPath = path.join(tmpDir, `${Date.now()}_input.${rawExt}`);

    const stream = await downloadContentFromMessage(mediaMessage, typeDetected === 'sticker' ? 'sticker' : typeDetected);
    const writeStream = fs.createWriteStream(rawPath);
    for await (const chunk of stream) writeStream.write(chunk);
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));

    const stats = fs.statSync(rawPath);
    if (stats.size > 200 * 1024 * 1024) {
      fs.unlinkSync(rawPath);
      throw new Error('⚠️ El archivo excede el límite de 200MB.');
    }

    let finalPath = rawPath;

    if (typeDetected === 'audio' && ['ogg', 'm4a', 'mpeg'].includes(rawExt)) {
      finalPath = path.join(tmpDir, `${Date.now()}_converted.mp3`);
      await new Promise((resolve, reject) => {
        ffmpeg(rawPath)
          .audioCodec('libmp3lame')
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(finalPath);
      });
      fs.unlinkSync(rawPath);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(finalPath));

    const res = await axios.post('https://cdn.russellxz.click/upload.php', form, {
      headers: form.getHeaders()
    });

    fs.unlinkSync(finalPath);

    let url = null;
    if (res.data) {
      if (typeof res.data === 'string') {
        try {
          const json = JSON.parse(res.data);
          url = json.url || res.data;
        } catch {
          url = res.data;
        }
      } else if (res.data.url) {
        url = res.data.url;
      }
    }

    if (!url) throw new Error('❌ No se pudo obtener el link del archivo subido.');

    await conn.sendMessage(chatId, {
      text: `✅ *Archivo subido exitosamente:*\n${url}`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: '✅', key: msg.key }
    });

  } catch (err) {
    await conn.sendMessage(chatId, {
      text: `❌ *Error:* ${err.message}`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: '❌', key: msg.key }
    });
  }
};

handler.command = ['tourl2'];
handler.help = ['tourl'];
handler.tags = ['herramientas'];
handler.register = true;

export default handler;
