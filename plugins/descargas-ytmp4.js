import axios from 'axios';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB límite (Whatsapp limitación habitual)
const TEMP_DIR = '/tmp'; // Ajusta según tu sistema operativo

// Validar URL YouTube básica
const isValidYouTubeUrl = (url) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);

const cleanFileName = (name) =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');

async function downloadVideoFile(videoUrl, dest) {
  const response = await axios.get(videoUrl, {
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.youtube.com',
    },
    timeout: 30000,
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return dest;
}

let handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply('Por favor, proporciona una URL de YouTube.');

  const url = args[0];
  if (!isValidYouTubeUrl(url)) return m.reply('⚠️ URL inválida de YouTube.');

  const API_KEY = 'sylphy-eab7';
  const apiEndpoint = `https://api.sylphy.xyz/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;

  try {
    await m.react('🕒');

    const { data } = await axios.get(apiEndpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Referer: 'https://api.sylphy.xyz/',
        Accept: 'application/json',
      }
    });

    if (!data || !data.result) {
      await m.react('✖️');
      return m.reply('⚠️ No se pudo obtener información del video. Intenta de nuevo más tarde.');
    }

    const videoInfo = data.result;
    const title = videoInfo.title || 'video';
    const videoUrl = videoInfo.url;
    const thumbnail = videoInfo.thumbnail || null;

    if (!videoUrl) {
      await m.react('✖️');
      return m.reply('⚠️ No se encontró URL para descargar el video.');
    }

    const fileName = cleanFileName(`${title}.mp4`);
    const destPath = path.join(TEMP_DIR, `${Date.now()}_${fileName}`);

    await downloadVideoFile(videoUrl, destPath);

    const stats = fs.statSync(destPath);
    if (stats.size > MAX_FILE_SIZE) {
      fs.unlinkSync(destPath);
      await m.react('✖️');
      return m.reply('⚠️ El video es demasiado grande para enviar (más de 100MB).');
    }

    await conn.sendMessage(m.chat, {
      video: fs.createReadStream(destPath),
      mimetype: 'video/mp4',
      fileName,
      contextInfo: {
        externalAdReply: {
          title,
          body: 'Descarga vía Sylphy API',
          mediaUrl: url,
          thumbnailUrl: thumbnail,
        }
      }
    }, { quoted: m });

    fs.unlinkSync(destPath);

    await m.react('✅');
  } catch (error) {
    console.error('Error en handler ytmp4 Sylphy API:', error);
    await m.react('✖️');
    m.reply('⚠️ Error al descargar el video o en la API. Intenta con otro enlace o más tarde.');
  }
};

handler.help = ['ytmp4 <url>'];
handler.command = ['ytmp4'];
handler.tags = ['descarga', 'video'];
handler.limit = true;

export default handler;
