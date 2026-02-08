import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

// Aumentamos el límite a 250MB para permitir canciones muy largas
const MAX_SIZE_MB = 250;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Función para formatear duración (flexible para lo que envíe la API)
function formatDuration(duration) {
  if (!duration) return 'Desconocido';
  if (typeof duration === 'string' && duration.includes(':')) return duration;
  
  const seconds = parseInt(duration);
  if (isNaN(seconds)) return 'Desconocido';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const APIS = [
  { 
    name: 'Stellar-GataDios', 
    url: `https://api.stellarwa.xyz/dl/youtubeplay?query=`,
    params: '&key=GataDios',
    getAudioUrl: (data) => data?.data?.download,
    getTitle: (data) => data?.data?.title,
    getThumb: (data) => data?.data?.thumbnail,
    getDuration: (data) => data?.data?.duration || data?.data?.timestamp
  },
  { 
    name: 'Stellar-v2-Yuki', 
    url: `https://api.stellarwa.xyz/dl/youtubeplay?query=`,
    params: '&key=YukiWaBot',
    getAudioUrl: (data) => data?.data?.download,
    getTitle: (data) => data?.data?.title,
    getThumb: (data) => data?.data?.thumbnail,
    getDuration: (data) => data?.data?.duration || data?.data?.timestamp
  },
  { 
    name: 'FAA-ytplay',           
    url: `https://api-faa.my.id/faa/ytplay?query=`,
    getAudioUrl: (data) => data?.result?.mp3,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.result?.thumb,
    getDuration: (data) => data?.result?.duration
  },
  { 
    name: 'Ootaizumi', 
    url: `https://api.ootaizumi.web.id/downloader/youtube/play?query=`,
    getAudioUrl: (data) => data?.result?.download,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.result?.image,
    getDuration: (data) => data?.result?.duration?.timestamp || data?.result?.timestamp
  },
  { 
    name: 'Adonix', 
    url: `https://api-adonix.ultraplus.click/download/ytaudio?apikey=AdonixKey2lph3k2117&url=`,
    getAudioUrl: (data) => data?.data?.url,
    getTitle: (data) => data?.data?.title,
    getThumb: (data) => data?.data?.thumbnail,
    getDuration: (data) => data?.data?.duration
  }
];

async function getAudioFromApis(url, controller) {
  for (const api of APIS) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const apiUrl = `${api.url}${encodedUrl}${api.params || ''}`;
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.status !== true && data?.status !== 'true') continue;
        
        const audioUrl = api.getAudioUrl(data);
        if (audioUrl) {
          return {
            success: true,
            title: api.getTitle(data) || 'Audio de YouTube',
            thumbnail: api.getThumb(data),
            url: audioUrl,
            duration: formatDuration(api.getDuration(data))
          };
        }
      }
    } catch (e) {
      // Intenta con la siguiente API
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  let searchData = null;
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) return m.reply('No se encontraron resultados');
    searchData = searchResults.videos[0];
    url = searchData.url;
  }

  try {
    await m.react('🕒');

    // Timeout de búsqueda extendido a 2 minutos para procesos pesados
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let apiResult = await getAudioFromApis(url, controller);
    clearTimeout(timeoutId);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio. Posiblemente el video es demasiado largo para las APIs actuales.`);
    }

    const finalDuration = apiResult.duration === 'Desconocido' && searchData 
      ? searchData.timestamp 
      : apiResult.duration;

    const { title, thumbnail, url: audioUrl } = apiResult;
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp3`.substring(0, 50);
    const dest = path.join('/tmp', `${Date.now()}_audio.mp3`);
    
    // Descarga sin señal de aborto agresiva para permitir archivos grandes
    const audioResponse = await fetch(audioUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://youtube.com/' }
    });

    if (!audioResponse.ok) throw new Error('Error al descargar el archivo de la API.');

    const arrayBuffer = await audioResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`El archivo es demasiado grande (${(arrayBuffer.byteLength/1024/1024).toFixed(1)}MB). El límite es ${MAX_SIZE_MB}MB.`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    const caption = `🎵 *${title}*\n⏱️ ${finalDuration}\n💾 ${sizeMB}MB\n\n*Pantheon Bot*`;

    // Enviar información
    if (thumbnail) {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m });
    } else {
      await m.reply(caption);
    }

    // Enviar el Audio
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(dest),
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });

    // Limpieza
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await m.react('✅');

  } catch (error) {
    await m.react('✖️');
    console.error(error);
    m.reply(`⚠️ *Error:* ${error.message}`);
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
