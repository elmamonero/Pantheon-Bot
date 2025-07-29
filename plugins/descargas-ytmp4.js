
/*import axios from 'axios';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const TEMP_DIR = '/tmp'; // Cambia según tu entorno

function extractYouTubeUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtu.be')) {
      return `https://youtu.be/${urlObj.pathname.slice(1)}`;
    } else if (urlObj.hostname.includes('youtube.com')) {
      const v = urlObj.searchParams.get('v');
      if (!v) return null;
      return `https://youtube.com/watch?v=${v}`;
    }
    return null;
  } catch {
    return null;
  }
}

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

  const rawUrl = args[0];
  const url = extractYouTubeUrl(rawUrl);
  if (!url) {
    console.log('URL inválida o sin ID de video.');
    return m.reply('⚠️ URL inválida o sin ID de video.');
  }

  console.log(`URL limpia para descargar: ${url}`);

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

    console.log('Respuesta API Sylphy:', JSON.stringify(data, null, 2));

    if (!data || !data.status || !data.res) {
      await m.react('✖️');
      console.log('No se recibió la propiedad "res" en la respuesta o status es falso.');
      return m.reply('⚠️ No se pudo obtener información válida del video. Intenta de nuevo más tarde.');
    }

    const videoInfo = data.res;
    const videoUrl = videoInfo.url;
    const title = videoInfo.title || 'video';
    const thumbnail = videoInfo.thumbnail || null;

    console.log(`Título del video: ${title}`);
    console.log(`URL para descarga directa: ${videoUrl}`);

    if (!videoUrl || videoUrl.includes('undefined')) {
      await m.react('✖️');
      console.log('URL de descarga inválida o indefinida.');
      return m.reply('⚠️ No se encontró URL válida para descargar el video.');
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

    console.log('Leyendo archivo en buffer para enviar como video...');
    const fileBuffer = fs.readFileSync(destPath);

    console.log('Enviando video al chat...');
    await conn.sendMessage(m.chat, {
      video: fileBuffer,
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
