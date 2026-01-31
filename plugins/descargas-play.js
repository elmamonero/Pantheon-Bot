import fetch from 'node-fetch';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { savetube } from '../lib/yt-savetube.js';
import { ogmp3 } from '../lib/youtubedl.js';

const LimitAud = 725 * 1024 * 1024;
const LimitVid = 425 * 1024 * 1024;
const userRequests = {};

const handler = async (m, { conn, command, args, text, usedPrefix }) => {
    if (!text) return m.reply(`*🤔 ¿Qué está buscando?*
*Ingrese el nombre de la canción o el enlace.*

*Ejemplo:*
${usedPrefix + command} emilia 420`);
    
    const tipoDescarga = ['play', 'musica', 'audio', 'play3'].includes(command) ? 'audio' : 'video';
    
    if (userRequests[m.sender]) return conn.reply(m.chat, `⏳ Espera, ya tienes una descarga en curso...`, m);
    userRequests[m.sender] = true;
    
    try {
        await m.react('🕓');
        
        const searchResult = await yts(text);
        const video = searchResult.videos[0];
        
        if (!video) {
            delete userRequests[m.sender];
            return m.reply('*❌ No se encontraron resultados.*');
        }
        
        const { title, thumbnail, url, timestamp } = video;
        
        await conn.sendMessage(m.chat, {
            text: `📌 *Título:* ${title}
⏰ *Duración:* ${timestamp}
📥 *Tipo:* ${tipoDescarga}

> *Probando APIs...*`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "Multi-API Downloader",
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaType: 1,
                    showAdAttribution: true
                }
            }
        }, { quoted: m });
        
        const isAudio = tipoDescarga === 'audio';
        const quality = isAudio ? '320' : '720';
        const apis = isAudio ? audioApis(url, quality) : videoApis(url, quality);
        
        const result = await tryApis(apis);
        if (!result.url) throw new Error('Todas las APIs fallaron');
        
        const fileSize = await getFileSize(result.url);
        const isDocument = ['play3', 'play4', 'playdoc', 'playdoc2'].includes(command);
        const fileName = `${title.slice(0, 50)}.${isAudio ? 'mp3' : 'mp4'}`;
        
        if (isAudio) {
            if (isDocument || fileSize > LimitAud) {
                await conn.sendMessage(m.chat, {
                    document: { url: result.url },
                    mimetype: 'audio/mpeg',
                    fileName
                }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, {
                    audio: { url: result.url },
                    mimetype: 'audio/mpeg',
                    fileName
                }, { quoted: m });
            }
        } else {
            const opts = {
                mimetype: 'video/mp4',
                fileName,
                caption: `🔰 ${title}`
            };
            if (isDocument || fileSize > LimitVid) {
                opts.document = { url: result.url };
            } else {
                opts.video = { url: result.url };
            }
            await conn.sendMessage(m.chat, opts, { quoted: m });
        }
        
        await m.react('✅');
        
    } catch (error) {
        console.error(error);
        await m.react('❌');
        m.reply(`*❌ Error:* ${error.message}`);
    } finally {
        delete userRequests[m.sender];
    }
};

// APIs AUDIO (prioridad: savetube > ogmp3 > externas)
function audioApis(url, quality) {
    return [
        { name: 'savetube', fn: () => savetube.download(url, 'mp3') },
        { name: 'ogmp3', fn: () => ogmp3.download(url, quality, 'audio') },
        { name: 'dorratz', fn: () => fetch(`https://api.dorratz.com/v3/ytdl?url=${url}`).then(r => r.json()) },
        { name: 'neoxr', fn: () => fetch(`https://api.neoxr.eu/api/youtube?url=${url}&type=audio&quality=128kbps&apikey=GataDios`).then(r => r.json()) }
    ];
}

// APIs VIDEO
function videoApis(url, quality) {
    return [
        { name: 'savetube', fn: () => savetube.download(url, '720') },
        { name: 'ogmp3', fn: () => ogmp3.download(url, quality, 'video') },
        { name: 'siputzx', fn: () => fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${url}`).then(r => r.json()) },
        { name: 'neoxr', fn: () => fetch(`https://api.neoxr.eu/api/youtube?url=${url}&type=video&quality=720p&apikey=GataDios`).then(r => r.json()) }
    ];
}

// Prueba APIs hasta encontrar una que funcione
async function tryApis(apis) {
    for (const api of apis) {
        try {
            console.log(`🔍 Probando ${api.name}...`);
            const data = await api.fn();
            
            let url = null;
            if (api.name === 'savetube' && data.result?.download) url = data.result.download;
            else if (api.name === 'ogmp3' && data.result?.download) url = data.result.download;
            else if (api.name === 'dorratz') url = data.medias?.find(m => m.quality === "160kbps" && m.extension === "mp3")?.url;
            else if (api.name === 'neoxr') url = data.data?.url;
            else if (api.name === 'siputzx') url = data.dl;
            
            if (url) {
                console.log(`✅ ${api.name} OK`);
                return { url };
            }
        } catch (e) {
            console.log(`❌ ${api.name}: ${e.message}`);
        }
    }
    return { url: null };
}

async function getFileSize(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return parseInt(response.headers.get('content-length') || 0);
    } catch {
        return 0;
    }
}

handler.help = ['play', 'play2', 'play3', 'play4'];
handler.tags = ['downloader'];
handler.command = ['play', 'play2', 'play3', 'play4', 'musica', 'video', 'audio', 'playdoc', 'playdoc2'];

export default handler;