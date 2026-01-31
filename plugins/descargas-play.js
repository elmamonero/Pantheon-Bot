import fetch from 'node-fetch';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { savetube } from '../lib/yt-savetube.js';

const LimitAud = 725 * 1024 * 1024;
const LimitVid = 425 * 1024 * 1024;
const youtubeRegexID = /(?:youtu.be/ | youtube.com / ( ? : watch ? v = | embed / ))([a - zA - Z0 - 9_ - ] { 11 }) / ;
const userRequests = {};

const handler = async (m, { conn, command, args, text, usedPrefix }) => {
    if (!text) return m.reply(`*🤔 ¿Qué está buscando?*
*Ingrese el nombre de la canción o el enlace.*

*Ejemplo:*
${usedPrefix + command} emilia 420`);
    
    const tipoDescarga = ['play', 'musica', 'audio', 'play3'].includes(command) ? 'audio' : 'video';
    
    if (userRequests[m.sender]) return await conn.reply(m.chat, `⏳ Espera, ya tienes una descarga en curso...`, m);
    userRequests[m.sender] = true;
    
    try {
        await m.react('🕓');
        
        let videoIdMatch = text.match(youtubeRegexID);
        let query = videoIdMatch ? `https://youtu.be/${videoIdMatch[1]}` : text;
        const searchResult = await yts(query);
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
        console.log('🔍 Savetube attempt...');
        try {
            const resSave = await savetube.download(url, quality);
            console.log('Savetube res:', JSON.stringify(resSave, null, 2));
            if (resSave.status && resSave.result?.download) {
                downloadUrl = resSave.result.download;
                console.log('✅ Savetube success');
            }
        } catch (e) {
            console.log('❌ Savetube error:', e.message);
        }
        
        // FALLBACK YT-DL
        if (!downloadUrl) {
            console.log('🔄 YTDL fallback...');
            try {
                const info = await ytdl.getInfo(url);
                const formats = ytdl.filterFormats(info.formats, isAudio ? 'audioonly' : 'video');
                downloadUrl = ytdl.chooseFormat(formats, { quality: isAudio ? 'highestaudio' : 'highestvideo' }).url;
                console.log('✅ YTDL success');
            } catch (e) {
                console.log('❌ YTDL error:', e.message);
                throw new Error('Ambas fuentes fallaron.');
            }
        }
        
        const fileSize = await getFileSize(downloadUrl);
        const isDocument = ['play3', 'play4', 'playdoc'].includes(command);
        
        const fileName = `${title.slice(0, 50)}.${isAudio ? 'mp3' : 'mp4'}`;
        
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
            const opts = {
                video: { url: downloadUrl },
                mimetype: 'video/mp4',
                fileName,
                caption: `🔰 ${title}`
            };
            if (isDocument || fileSize > LimitVid) {
                opts.document = opts.video;
                delete opts.video;
            }
            await conn.sendMessage(m.chat, opts, { quoted: m });
        }
        
        await m.react('✅');
        
    } catch (error) {
        console.error('Handler error:', error);
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