import fetch from 'node-fetch';
import yts from 'yt-search';
import ytdl from 'ytdl-core';
import axios from 'axios'; 
import { savetube } from '../lib/yt-savetube.js'
import { ogmp3 } from '../lib/youtubedl.js'; 

const LimitAud = 725 * 1024 * 1024; // 725MB
const LimitVid = 425 * 1024 * 1024; // 425MB
const youtubeRegexID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;
const userRequests = {};

const handler = async (m, { conn, command, args, text, usedPrefix }) => {
    if (!text) return m.reply(`*🤔 ¿Qué está buscando?*\n*Ingrese el nombre de la canción o el enlace.*\n\n*Ejemplo:*\n${usedPrefix + command} emilia 420`);

    const tipoDescarga = ['play', 'musica', 'play3'].includes(command) ? 'audio' : 'video';
    
    if (userRequests[m.sender]) return await conn.reply(m.chat, `⏳ Espere, ya tiene una descarga en curso...`, m);
    userRequests[m.sender] = true;

    try {
        await m.react('🕓');
        
        // Búsqueda del video
        let videoIdMatch = text.match(youtubeRegexID);
        let query = videoIdMatch ? `https://youtu.be/${videoIdMatch[1]}` : text;
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        
        if (!video) {
            delete userRequests[m.sender];
            return m.reply('*❌ No se encontraron resultados.*');
        }

        const { title, thumbnail, url, timestamp } = video;

        // Mensaje de info inicial
        await conn.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: `📌 *Título:* ${title}\n⏰ *Duración:* ${timestamp}\n📥 *Tipo:* ${tipoDescarga}\n\n> *Descargando mediante servidores de alta capacidad...*`
        }, { quoted: m });

        let mediaData = null;
        const isAudio = ['play', 'musica', 'play3'].includes(command);

        // --- Lógica de APIs (Savetube, OGMP3 y Fallbacks) ---
        const download = async () => {
            if (isAudio) {
                // Intentar Audio
                try { 
                    let res = await savetube.download(url, '320');
                    if (res?.result?.download) return res.result.download;
                } catch {}
                try { 
                    let res = await ogmp3.download(url, '320', 'audio');
                    if (res?.result?.download) return res.result.download;
                } catch {}
                // Fallback APIs externas
                const fallbacks = [
                    `https://api.alyachan.dev/api/ytmp3?url=${url}`,
                    `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${url}`
                ];
                for (let api of fallbacks) {
                    try {
                        let res = await fetch(api).then(r => r.json());
                        let link = res.result?.url || res.data?.url || res.url;
                        if (link) return link;
                    } catch {}
                }
            } else {
                // Intentar Video
                try { 
                    let res = await savetube.download(url, '720');
                    if (res?.result?.download) return res.result.download;
                } catch {}
                try { 
                    let res = await ogmp3.download(url, '720', 'video');
                    if (res?.result?.download) return res.result.download;
                } catch {}
                // Fallback Video
                try {
                    let res = await fetch(`https://api.alyachan.dev/api/ytmp4?url=${url}`).then(r => r.json());
                    if (res.result?.url) return res.result.url;
                } catch {}
            }
            return null;
        };

        mediaData = await download();

        if (!mediaData) throw new Error('No se pudo obtener el enlace de descarga.');

        const fileSize = await getFileSize(mediaData);
        const isDocument = ['play3', 'play4', 'playdoc'].includes(command);

        if (isAudio) {
            if (isDocument || fileSize > LimitAud) {
                await conn.sendMessage(m.chat, { document: { url: mediaData }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, { audio: { url: mediaData }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m });
            }
        } else {
            if (isDocument || fileSize > LimitVid) {
                await conn.sendMessage(m.chat, { document: { url: mediaData }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `🔰 ${title}` }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, { video: { url: mediaData }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `🔰 ${title}` }, { quoted: m });
            }
        }

        await m.react('✅');

    } catch (error) {
        console.error(error);
        await m.react('❌');
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
