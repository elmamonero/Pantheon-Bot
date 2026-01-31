import fetch from 'node-fetch';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { savetube } from '../lib/yt-savetube.js';

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
        
        // BÚSQUEDA SIMPLE - SIN REGEX
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

> *Savetube + fallback...*`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "Savetube Downloader",
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });
        
        let downloadUrl = null;
        const isAudio = tipoDescarga === 'audio';
        const quality = isAudio ? 'mp3' : '720';
        
        // SAVETUBE
        console.log('🔍 Probando savetube...');
        try {
            const resSave = await savetube.download(url, quality);
            console.log('Savetube:', resSave);
            if (resSave.status && resSave.result && resSave.result.download) {
                downloadUrl = resSave.result.download;
                console.log('✅ Savetube OK');
            }
        } catch (e) {
            console.log('❌ Savetube error:', e.message);
        }
        
        // FALLBACK YT-DL
        if (!downloadUrl) {
            console.log('🔄 Usando ytdl...');
            try {
                const info = await ytdl.getInfo(url);
                const format = ytdl.chooseFormat(info.formats, {
                    quality: isAudio ? 'highestaudio' : 'highestvideo[height<=720]'
                });
                downloadUrl = format.url;
                console.log('✅ YTDL OK');
            } catch (e) {
                console.log('❌ YTDL error:', e.message);
                throw new Error('No se pudo descargar el video.');
            }
        }
        
        const fileSize = await getFileSize(downloadUrl);
        const isDocument = ['play3', 'play4', 'playdoc'].includes(command);
        const fileName = `${title.slice(0, 50).replace(/[^ws-]/gi, '')}.${isAudio ? 'mp3' : 'mp4'}`;
        
        if (isAudio) {
            if (isDocument || fileSize > LimitAud) {
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName
                }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName
                }, { quoted: m });
            }
        } else {
            if (isDocument || fileSize > LimitVid) {
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    mimetype: 'video/mp4',
                    fileName,
                    caption: `🔰 ${title}`
                }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, {
                    video: { url: downloadUrl },
                    mimetype: 'video/mp4',
                    fileName,
                    caption: `🔰 ${title}`
                }, { quoted: m });
            }
        }
        
        await m.react('✅');
        
    } catch (error) {
        console.error('Error:', error);
        await m.react('❌');
        m.reply(`*❌ Error:* ${error.message}`);
    } finally {
        delete userRequests[m.sender];
    }
};

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