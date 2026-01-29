import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return conn.reply(m.chat, `*🐱 Ingresa un título de Youtube.*\n\n*🐈 Ejemplo:* ${usedPrefix + command} Corazón Serrano`, m);

    await m.react('🕓');
    try {
        const search = await yts(args.join(" "));
        const video = search.videos[0];
        
        if (!video) {
            await m.react('✖️');
            return conn.reply(m.chat, '*`No se encontraron resultados.`*', m);
        }

        const { title, thumbnail, timestamp, url } = video;
        const authorName = video.author.name || 'Desconocido';
        const ago = video.ago || 'Reciente';

        let messageText = `*╔═══════『 DESCARGAS 』══════╗*\n`;
        messageText += `*┃* 🏷️ *Título:* ${title}\n`;
        messageText += `*┃* ⌛ *Duración:* ${timestamp}\n`;
        messageText += `*┃* 👤 *Autor:* ${authorName}\n`;
        messageText += `*┃* 🖇️ *Url:* ${url}\n`;
        messageText += `*╚════════════════════╝*\n\n`;
        messageText += `> *Enviando audio, por favor espera...*`;

        await conn.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: messageText 
        }, { quoted: m });

        let downloadUrl = null;
        
        // INTENTO 1: API de Lolhuman
        try {
            let res = await fetch(`https://api.lolhuman.xyz/api/ytaudio2?apikey=GataDios&url=${url}`);
            let json = await res.json();
            if (json.status === 200 && json.result.link) {
                downloadUrl = json.result.link;
            }
        } catch (err) {
            console.log('Error en API 1, intentando API 2...');
        }

        // INTENTO 2: API Alternativa (si la primera falló)
        if (!downloadUrl) {
            try {
                let res2 = await fetch(`https://api.zenkey.my.id/api/download/ytmp3?url=${url}&apikey=zenkey`);
                let json2 = await res2.json();
                if (json2.status && json2.result.download.url) {
                    downloadUrl = json2.result.download.url;
                }
            } catch (err) {
                console.log('Error en API 2');
            }
        }

        // ENVIAR EL AUDIO
        if (downloadUrl) {
            await conn.sendMessage(m.chat, { 
                audio: { url: downloadUrl }, 
                mimetype: 'audio/mp4', 
                fileName: `${title}.mp3` 
            }, { quoted: m });
            await m.react('✅');
        } else {
            throw new Error('No se pudo obtener el enlace de descarga.');
        }

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        // Aquí mostramos el error real en la consola para saber qué pasó
        conn.reply(m.chat, `*`Error:`* ${e.message}`, m);
    }
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play', 'play2'];

export default handler;
