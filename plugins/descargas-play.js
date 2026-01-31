import fs from 'fs';
import path from 'path';
import yts from 'yt-search';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const APIS = [
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
      const apiUrl = `${api.url}${encodedUrl}`;
      
      console.log(`🔄 Probando ${api.name}:`, apiUrl);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`${api.name} status:`, data?.status);
        
        const audioUrl = api.getAudioUrl(data);
        
        if (audioUrl) {
          console.log(`✅ ${api.name} exitosa - ${api.getTitle(data)}`);
          return {
            success: true,
            api: api.name,
            title: api.getTitle(data) || 'Audio de YouTube',
            thumbnail: api.getThumb(data),
            url: audioUrl,
            duration: api.getDuration(data) || 'Desconocido'
          };
        } else {
          console.log(`❌ ${api.name}: No hay audio disponible`);
        }
      }
    } catch (e) {
      console.log(`❌ ${api.name} falló:`, e.message);
    }
  }
  return { success: false };
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) return m.reply('Por favor, ingresa un nombre o URL de un video de YouTube');

  let url = args[0];
  const isUrl = /(youtube\.com|youtu\.be)/.test(url);

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
      return m.reply(`*✖️ Error:* No se pudo obtener el audio de ninguna API.\n\n*Eli Bot*`);
    }

    console.log(`🎵 ${apiResult.api}: ${apiResult.title}`);

    const { title, thumbnail, url: audioUrl, duration, api } = apiResult;
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

    const sendTextMessage = (title, duration, url, size, apiName) => {
      return conn.sendMessage(m.chat, {
        text: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${url}\n💾 ${(size/1024/1024).toFixed(1)}MB\n🔗 *${apiName} API*\n\n*Eli Bot*`,
      }, { quoted: m });
    };

    if (thumbnail) {
      try {
        const thumbResponse = await fetch(thumbnail, { signal: AbortSignal.timeout(5000) });
        const thumbBuffer = await thumbResponse.arrayBuffer();
        await conn.sendMessage(m.chat, {
          image: Buffer.from(thumbBuffer),
          caption: `🎵 *${title}*\n⏱️ ${duration}\n📎 ${url}\n💾 ${(stats.size/1024/1024).toFixed(1)}MB\n🔗 *${api} API*\n\n*Eli Bot*`,
        }, { quoted: m });
      } catch (e) {
        console.log('Thumbnail falló:', e.message);
        await sendTextMessage(title, duration, url, stats.size, api);
      }
    } else {
      await sendTextMessage(title, duration, url, stats.size, api);
    }

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
      return m.reply(`⏰ *Timeout* - Canción muy pesada (>${MAX_SIZE_MB}MB)\n\n*Eli Bot*`);
    }
    
    if (error.message.includes('muy pesado')) {
      await m.react('📏');
      return m.reply(`${error.message}\n\n*Eli Bot*`);
    }
    
    console.error('Error:', error);
    await m.react('✖️');
    m.reply('⚠️ Falló la descarga. Prueba con otra canción.\n\n*Eli Bot*');
  }
};

handler.help = ['play <nombre|URL>'];
handler.command = ['play'];
handler.tags = ['descargas'];
export default handler;
