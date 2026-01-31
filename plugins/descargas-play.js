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
            text: `📌 *Título:* ${title}\n⏰ *Duración:* ${timestamp}\n📥 *Tipo:* ${tipoDescarga}\n\n> *Descargando mediante Savetube / OGMP3...*`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "Descargador local",
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });

        let downloadUrl = null;
        const isAudio = ['play', 'musica', 'audio', 'play3'].includes(command);
        const quality = isAudio ? '320' : '720';

        // --- INTENTO 1: SAVETUBE (LOCAL) ---
        try {
            const resSave = await savetube.download(url, quality);
            // Buscamos el link en todas las propiedades posibles de la respuesta
            downloadUrl = resSave?.result?.download || resSave?.download || resSave?.link || resSave?.url || resSave?.result?.url;
        } catch (e) {
            console.log("Error en Savetube local:", e.message);
        }

        // --- INTENTO 2: OGMP3 (LOCAL) ---
        if (!downloadUrl) {
            try {
                const resOG = await ogmp3.download(url, quality, isAudio ? 'audio' : 'video');
                downloadUrl = resOG?.result?.download || resOG?.download || resOG?.link || resOG?.url || resOG?.result?.url;
            } catch (e) {
                console.log("Error en OGMP3 local:", e.message);
            }
        }

        if (!downloadUrl) {
            throw new Error('No se pudo obtener el enlace de descarga de tus librerías.');
        }

        const fileSize = await getFileSize(downloadUrl);
        const isDocument = ['play3', 'play4', 'playdoc'].includes(command);

        if (isAudio) {
            if (isDocument || fileSize > LimitAud) {
                await conn.sendMessage(m.chat, { document: { url: downloadUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m });
            }
        } else {
            if (isDocument || fileSize > LimitVid) {
                await conn.sendMessage(m.chat, { document: { url: downloadUrl }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `🔰 ${title}` }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, { video: { url: downloadUrl }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `🔰 ${title}` }, { quoted: m });
            }
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
