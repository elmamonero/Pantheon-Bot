import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const APIS = [
  {
    name: 'Stellar-YTMP4',
    url: `https://api.stellarwa.xyz/dl/ytmp4?url=`,
    params: '&quality=360&key=Yuki-v2',
    getVideoUrl: (data) => data?.result?.download || data?.data?.download || data?.data?.url,
    getTitle: (data) => data?.result?.title || data?.data?.title,
    getThumb: (data) => data?.result?.thumbnail || data?.data?.thumbnail,
    getDuration: (data) => data?.result?.duration || data?.data?.duration
  },
  {
    name: 'Adonix-Video',
    url: `https://api-adonix.ultraplus.click/download/ytvideo?apikey=AdonixKey2lph3k2117&url=`,
    getVideoUrl: (data) => data?.data?.url,
    getTitle: (data) => data?.data?.title,
    getThumb: (data) => data?.data?.thumbnail,
    getDuration: (data) => data?.data?.duration
  }
];

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Desconocido';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getVideoFromApis(url, controller) {
  for (const api of APIS) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const apiUrl = `${api.url}${encodedUrl}${api.params || ''}`;
      
      console.log(`🎥 [YTMP4] Probando ${api.name}:`, apiUrl.substring(0, 80) + '...');
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`🎥 [YTMP4] ${api.name} status: ${data?.status}`);
        
        if (data?.status !== true && data?.status !== 'true') {
          console.log(`❌ [YTMP4] ${api.name} status inválido`);
          continue;
        }
        
        const videoUrl = api.getVideoUrl(data);
        
        if (videoUrl) {
          console.log(`✅ [YTMP4] ${api.name} exitosa: ${api.getTitle(data)}`);
          const rawDuration = api.getDuration(data);
          return {
            success: true,
            api: api.name,
            title: api.getTitle(data) || 'Video de YouTube',
            thumbnail: api.getThumb(data),
            url: videoUrl,
            duration: formatDuration(rawDuration)
          };
        } else {
          console.log(`❌ [YTMP4] ${api.name}: No video URL`);
        }
      }
    } catch (e) {
      console.log(`❌ [YTMP4] ${api.name} error: ${e.message}`);
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args, command }) => {
  console.log(`🎥 [YTMP4] Comando recibido: ${args.join(' ')}`);
  
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\\.com|youtu\\.be)/.test(url);

  if (!isUrl) {
    console.log(`🔍 [YTMP4] Buscando: ${args.join(' ')}`);
    const searchResults = await yts(args.join(' '));
    if (!searchResults.videos.length) {
      console.log(`❌ [YTMP4] Sin resultados búsqueda`);
      return m.reply('No se encontraron resultados para tu búsqueda');
    }
    url = searchResults.videos[0].url;
    console.log(`✅ [YTMP4] URL encontrada: ${url}`);
  }

  try {
    await m.react('🕒');
    console.log(`⬇️ [YTMP4] Iniciando descarga...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const apiResult = await getVideoFromApis(url, controller);
    clearTimeout(timeoutId);

    if (!apiResult.success) {
      console.log(`❌ [YTMP4] Todas las APIs fallaron`);
      await m.react('✖️');
      return m.reply(`*✖️ Error:* No se pudo obtener el video.\n\n*Pantheon Bot*`);
    }

    const { title, thumbnail, url: videoUrl, duration } = apiResult;
    const fileName = `${title.replace(/[^\w\s-]/g, '')}.mp4`.replace(/\s+/g, '_').substring(0, 50);
    
    console.log(`📹 [YTMP4] Enviando: ${title} (${duration})`);

    const dest = path.join('/tmp', `${Date.now()}_${fileName}`);
    
    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://youtube.com/',
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!videoResponse.ok) {
      console.log(`❌ [YTMP4] Error descarga HTTP: ${videoResponse.status}`);
      throw new Error(`Error descarga: ${videoResponse.status}`);
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    const sizeMB = (arrayBuffer.byteLength/1024/1024).toFixed(1);
    
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      console.log(`📏 [YTMP4] Archivo muy grande: ${sizeMB}MB`);
      throw new Error(`Archivo muy pesado (${sizeMB}MB). Máximo ${MAX_SIZE_MB}MB`);
    }

    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
    const stats = fs.statSync(dest);
    console.log(`💾 [YTMP4] Archivo guardado: ${sizeMB}MB`);

    const sendTextMessage = (title, duration, size) => {
      return conn.sendMessage(m.chat, {
        text: `🎥 *${title}*\n⏱️ ${duration}\n💾 ${(size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
      }, { quoted: m });
    };

    if (thumbnail) {
      try {
        console.log(`🖼️ [YTMP4] Enviando thumbnail...`);
        const thumbResponse = await fetch(thumbnail, { signal: AbortSignal.timeout(5000) });
        const thumbBuffer = await thumbResponse.arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎥 *${title}*\n⏱️ ${duration}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n\n*Pantheon Bot*`,
        }, { quoted: m });
      } catch (e) {
        console.log(`❌ [YTMP4] Thumbnail falló`);
        await sendTextMessage(title, duration, stats.size);
      }
    } else {
      await sendTextMessage(title, duration, stats.size);
    }

    console.log(`📤 [YTMP4] Enviando video...`);
    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      mimetype: 'video/mp4',
      fileName,
    }, { quoted: m });

    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    
    await m.react('✅');
    console.log(`✅ [YTMP4] Completado: ${title}`);

  } catch (error) {
    console.log(`💥 [YTMP4] Error final: ${error.message}`);
    
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
