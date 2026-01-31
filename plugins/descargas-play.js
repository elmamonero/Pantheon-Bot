import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Función para formatear duración
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Desconocido';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const APIS = [
  { 
    name: 'FAA-ytplay',           
    url: `https://api-faa.my.id/faa/ytplay?query=`,
    getAudioUrl: (data) => data?.result?.mp3,
    getTitle: (data) => data?.result?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.result?.thumb,
    getDuration: (data) => data?.result?.duration
  },
  { 
    name: 'Stellar-v2-Yuki', 
    url: `https://api.stellarwa.xyz/dl/youtubeplay?query=`,
    params: '&key=Yuki-v2',
    getAudioUrl: (data) => data?.data?.download,
    getTitle: (data) => data?.data?.title,
    getThumb: (data) => data?.data?.thumbnail,
    getDuration: (data) => data?.data?.duration
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
        
        if (data?.status !== true && data?.status !== 'true') {
          continue;
        }
        
        const audioUrl = api.getAudioUrl(data);
        
        if (audioUrl) {
          const rawDuration = api.getDuration(data);
          return {
            success: true,
            title: api.getTitle(data) || 'Audio de YouTube',
            thumbnail: api.getThumb(data),
            url: audioUrl,
            duration: formatDuration(rawDuration) // ← Duración formateada MM:SS
          };
        }
      }
    } catch (e) {
      // Sin logs
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\\.com|youtu\\.be)/.test(url);

  if (!isUrl) {
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) {
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = searchResults.videos[0].url;
  }

  try {
    await m.react('🕒');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const apiResult = await getAudioFromApis(url, controller);
    clearTimeout(timeoutId);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el audio de ninguna API.\n\n*Pantheon Bot*`);
    }

    const { title, thumbnail, url: audioUrl, duration } = apiResult;
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp3`.replace(/\s+/g, '_').substring(0, 50);

    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);
    
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://youtube.com/',
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!audioResponse.ok) {
      throw new Error(`Error descarga: ${audioResponse.status}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${(arrayBuffer.byteLength/1024/1024).toFixed(1)}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);

    const sendTextMessage = (title, duration, size) => {
      return conn.sendMessage(m.chat, {
        text: `🎵 *${title}*\n⏱️ ${duration}\n💾 ${(size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
      }, { quoted: m });
    };

    if (thumbnail) {
      try {
        const thumbResponse = await fetch(thumbnail, { signal: AbortSignal.timeout(5000) });
        const thumbBuffer = await thumbResponse.arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎵 *${title}*\n⏱️ ${duration}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
        }, { quoted: m });
      } catch (e) {
        await sendTextMessage(title, duration, stats.size);
      }
    } else {
      await sendTextMessage(title, duration, stats.size);
    }

    // ← SIN nombre de API aquí
    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    
    await m.react('✅');

  } catch (error) {
    if (error.name === 'AbortError') {
      await m.react('⏰');
      return m.reply(`⏰ *Timeout* - Canción muy pesada (>${MAX_SIZE_MB}MB)\n\n*Pantheon Bot*`);
    }
    
    if (error.message.includes('muy pesado')) {
      await m.react('📏');
      return m.reply(`${error.message}\n\n*Pantheon Bot*`);
    }
    
    await m.react('✖️');
    m.reply('⚠️ Falló la descarga. Prueba con otra canción.\n\n*Pantheon Bot*');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
