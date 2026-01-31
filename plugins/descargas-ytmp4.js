import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const API = {
  name: 'Adonix-Video',
  url: `https://api-adonix.ultraplus.click/download/ytvideo?apikey=AdonixKey2lph3k2117&url=`,
  getVideoUrl: (data) => data?.data?.url,
  getTitle: (data) => data?.data?.title,
  getThumb: (data) => data?.data?.thumbnail,
  getDuration: (data) => data?.data?.duration
};

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Desconocido';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getVideoFromApi(url) {
  try {
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `${API.url}${encodedUrl}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data?.status !== true && data?.status !== 'true') {
        return { success: false };
      }
      
      const videoUrl = API.getVideoUrl(data);
      
      if (videoUrl) {
        const rawDuration = API.getDuration(data);
        return {
          success: true,
          title: API.getTitle(data) || 'Video de YouTube',
          thumbnail: API.getThumb(data),
          url: videoUrl,
          duration: formatDuration(rawDuration)
        };
      }
    }
  } catch (e) {
    // Silencio
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

    const apiResult = await getVideoFromApi(url);

    if (!apiResult.success) {
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el video.\n\n*Pantheon Bot*`);
    }

    const { title, thumbnail, url: videoUrl, duration } = apiResult;
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp4`.replace(/\s+/g, '_').substring(0, 50);

    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);
    
    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://youtube.com/',
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!videoResponse.ok) {
      throw new Error(`Error descarga: ${videoResponse.status}`);
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new Error(`Archivo muy pesado (${(arrayBuffer.byteLength/1024/1024).toFixed(1)}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);

    const sendTextMessage = (title, duration, size) => {
      return conn.sendMessage(m.chat, {
        text: `🎥 *${title}*\n⏱️ ${duration}\n💾 ${(size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
      }, { quoted: m });
    };

    if (thumbnail) {
      try {
        const thumbResponse = await fetch(thumbnail, { signal: AbortSignal.timeout(5000) });
        const thumbBuffer = await thumbResponse.arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎥 *${title}*\n⏱️ ${duration}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
        }, { quoted: m });
      } catch (e) {
        await sendTextMessage(title, duration, stats.size);
      }
    } else {
      await sendTextMessage(title, duration, stats.size);
    }

    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      mimetype: 'video/mp4',
      fileName,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    
    await m.react('✅');

  } catch (error) {
    if (error.name === 'AbortError') {
      await m.react('⏰');
      return m.reply(`⏰ *Timeout* - Video muy pesado (>${MAX_SIZE_MB}MB)\n\n*Pantheon Bot*`);
    }
    
    if (error.message.includes('muy pesado')) {
      await m.react('📏');
      return m.reply(`${error.message}\n\n*Pantheon Bot*`);
    }
    
    await m.react('✖️');
    m.reply('⚠️ Falló la descarga. Prueba con otro video.\n\n*Pantheon Bot*');
  }
};

handler.help = ['ytmp4 <nombre|URL>'];
handler.command = ['ytmp4', 'video'];
handler.tags = ['descargas'];
export default handler;
