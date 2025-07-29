import axios from 'axios';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const TEMP_DIR = '/tmp'; // Cambia si usas otro SO

const isValidYouTubeUrl = (url) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);

const cleanFileName = (name) =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');

async function downloadVideoFile(videoUrl, dest) {
  console.log(`Iniciando descarga del video desde: ${videoUrl}`);

  const response = await axios.get(videoUrl, {
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.youtube.com',
    },
    timeout: 30000,
  });

  console.log(`Status de la respuesta al descargar video: ${response.status}`);

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', () => {
      console.log(`Descarga completada: archivo guardado en ${dest}`);
      resolve();
    });
    writer.on('error', (err) => {
      console.error('Error al escribir archivo:', err);
      reject(err);
    });
  });

  return dest;
}

let handler = async (m, { conn, args }) => {
  if (!args[0]) {
    console.log('No se proporcionó URL en el comando.');
    return m.reply('Por favor, proporciona una URL de YouTube.');
  }

  // Limpieza básica URL para evitar parámetros problemáticos
  let url = args[0].split('?')[0];
  console.log(`URL proporcionada para descarga: ${url}`);

  if (!isValidYouTubeUrl(url)) {
    console.log('URL inválida detectada.');
    return m.reply('⚠️ URL inválida de YouTube.');
  }

  const API_KEY = 'sylphy-eab7';
  const apiEndpoint = `https://api.sylphy.xyz/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;

  try {
    await m.react('🕒');

    console.log(`Realizando petición a la API Sylphy: ${apiEndpoint}`);

    const { data } = await axios.get(apiEndpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Referer: 'https://api.sylphy.xyz/',
        Accept: 'application/json',
      }
    });

    console.log('Respuesta de la API Sylphy:', JSON.stringify(data, null, 2));

    if (!data || !data.result) {
      await m.react('✖️');
      console.log('No se recibió la propiedad "result" en la respuesta.');
      return m.reply('⚠️ No se pudo obtener información del video. Intenta de nuevo más tarde.');
    }

    const videoInfo = data.result;
    const title = videoInfo.title || 'video';
    const videoUrl = videoInfo.url;
    const thumbnail = videoInfo.thumbnail || null;

    console.log(`Título del video: ${title}`);
    console.log(`URL para descarga directa: ${videoUrl}`);

    if (!videoUrl) {
      await m.react('✖️');
      console.log('No se encontró URL para descargar el video en la respuesta.');
      return m.reply('⚠️ No se encontró URL para descargar el video.');
    }

    const fileName = cleanFileName(`${title}.mp4`);
    const destPath = path.join(TEMP_DIR, `${Date.now()}_${fileName}`);
    console.log(`Ruta local para guardar video: ${destPath}`);

    await downloadVideoFile(videoUrl, destPath);

    const stats = fs.statSync(destPath);
    console.log(`Tamaño del archivo descargado: ${stats.size} bytes`);

    if (stats.size > MAX_FILE_SIZE) {
      fs.unlinkSync(destPath);
      await m.react('✖️');
      console.log('Archivo demasiado grande para enviar (mayor a 100MB).');
      return m.reply('⚠️ El video es demasiado grande para enviar (más de 100MB).');
    }

    console.log('Enviando video al chat...');

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

    console.log('Video enviado correctamente y archivo temporal eliminado.');
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
