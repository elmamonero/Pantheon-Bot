
import axios from 'axios';
import crypto from 'crypto';

const savetube = {
  api: {
    base: "https://media.savetube.me/api",
    cdn: "/random-cdn",
    info: "/v2/info",
    download: "/download"
  },
  headers: {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://yt.savetube.me',
    'referer': 'https://yt.savetube.me/',
    'user-agent': 'Postify/1.0.0'
  },
  formats: ['mp3'],

  crypto: {
    hexToBuffer: (hexString) => Buffer.from(hexString.match(/.{1,2}/g).join(''), 'hex'),

    decrypt: async (enc) => {
      const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
      const data = Buffer.from(enc, 'base64');
      const iv = data.slice(0, 16);
      const content = data.slice(16);
      const key = savetube.crypto.hexToBuffer(secretKey);
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
      return JSON.parse(decrypted.toString());
    }
  },

  isUrl: str => {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  },

  youtube: url => {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (let regex of patterns) {
      if (regex.test(url)) return url.match(regex)[1];
    }
    return null;
  },

  request: async (endpoint, data = {}, method = 'post') => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith('http') ? '' : savetube.api.base}${endpoint}`,
        data: method === 'post' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: savetube.headers
      });
      return { status: true, code: 200, data: response };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        error: error.message
      };
    }
  },

  getCDN: async () => {
    const res = await savetube.request(savetube.api.cdn, {}, 'get');
    return res.status ? { status: true, code: 200, data: res.data.cdn } : res;
  },

  download: async (link) => {
    if (!link) return { status: false, code: 400, error: "Falta el enlace de YouTube." };
    if (!savetube.isUrl(link)) return { status: false, code: 400, error: "URL inválida de YouTube." };

    const id = savetube.youtube(link);
    if (!id) return { status: false, code: 400, error: "*No se pudo extraer el ID del video.*" };

    try {
      const cdnRes = await savetube.getCDN();
      if (!cdnRes.status) return cdnRes;
      const cdn = cdnRes.data;

      const infoRes = await savetube.request(`https://${cdn}${savetube.api.info}`, {
        url: `https://www.youtube.com/watch?v=${id}`
      });
      if (!infoRes.status || !infoRes.data?.data)
        return { status: false, code: 500, error: 'Error al obtener o procesar datos del video.' };

      const decrypted = await savetube.crypto.decrypt(infoRes.data.data);

      const dl = await savetube.request(`https://${cdn}${savetube.api.download}`, {
        id,
        downloadType: 'audio',
        quality: '128',
        key: decrypted.key
      });

      return {
        status: true,
        code: 200,
        result: {
          title: decrypted.title || "Desconocido",
          type: 'audio',
          format: 'mp3',
          thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          download: dl.data.data.downloadUrl,
          id,
          key: decrypted.key,
          duration: decrypted.duration,
          quality: '128'
        }
      };

    } catch (error) {
      return { status: false, code: 500, error: error.message };
    }
  }
};

const handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply(`*❗ Ingresa una URL de un video o audio de YouTube*`);

  const url = args[0];
  if (!savetube.isUrl(url)) return m.reply("*⚠️ Ingresa un link válido de YouTube.*");

  try {
    await m.react('🕒');
    const res = await savetube.download(url);

    if (!res.status) {
      await m.react('✖️');
      return m.reply(`\`\`\`❌ Error:\`\`\` ${res.error}`);
    }

    const { title, download } = res.result;
    await conn.sendMessage(m.chat, {
      audio: { url: download },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    await m.react('✖️');
    m.reply(`*⚠️ La descarga ha fallado, es posible que el archivo sea muy pesado.*`);
  }
};

handler.help = ['ytmp3 *<url>*'];
handler.command = ['ytmp3'];
handler.tags = ['descargas'];

export default handler;

/*
import fetch from "node-fetch";
import yts from "yt-search";

const encodedApi = "aHR0cHM6Ly9hcGkudnJlZGVuLndlYi5pZC9hcGkveXRtcDM=";

const getApiUrl = () => Buffer.from(encodedApi, "base64").toString("utf-8");

const fetchWithRetries = async (url, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data?.status === 200 && data.result?.download?.url) {
        return data.result;
      }
    } catch (error) {
      console.error(`Intento ${attempt + 1} fallido:`, error.message);
    }
  }
  throw new Error("No se pudo obtener la música después de varios intentos.");
};

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text || !text.trim()) {
      return conn.reply(m.chat, `*❌ Por favor, ingresa un título o URL de YouTube.*`, m);
    }

    await conn.sendMessage(m.chat, { react: { text: "🕒", key: m.key } });

    const searchResults = await yts(text.trim());
    const video = searchResults.videos[0];
    if (!video || !video.url) throw new Error("No se encontraron resultados válidos.");

    const apiUrl = `${getApiUrl()}?url=${encodeURIComponent(video.url)}`;
    const apiData = await fetchWithRetries(apiUrl);
    const meta = apiData.metadata;

    const audioMessage = {
      audio: { url: apiData.download.url },
      mimetype: "audio/mpeg",
      ptt: false, // true para nota de voz
      fileName: apiData.download.filename,
      contextInfo: {
        externalAdReply: {
          title: meta.title,
          body: 'YouTube - MP3',
          thumbnailUrl: meta.thumbnail,
          mediaType: 2,
          mediaUrl: meta.url,
          sourceUrl: meta.url,
          showAdAttribution: true,
        },
      },
    };

    await conn.sendMessage(m.chat, audioMessage, { quoted: m });
    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error("Error:", error);
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    await conn.reply(m.chat, `❌ No se pudo obtener el audio. Intenta con otro título o más tarde.`, m);
  }
};


handler.command = ['ytmp3'];
handler.help = ['ytmp3'];
handler.tags = ['descargas'];

export default handler;*/
