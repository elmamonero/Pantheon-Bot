import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return conn.reply(m.chat, '*🐱 Ingresa un título de Youtube.*', m);

    await m.react('🕓');
    try {
        const search = await yts(args.join(" "));
        const video = search.videos[0];
        if (!video) return conn.reply(m.chat, '*No se encontraron resultados.*', m);

        const { title, thumbnail, timestamp, url } = video;

        let txt = `*╔═══════『 DESCARGAS 』══════╗*\n`;
        txt += `*┃* 🏷️ *Título:* ${title}\n`;
        txt += `*┃* ⌛ *Duración:* ${timestamp}\n`;
        txt += `*┃* 🖇️ *Url:* ${url}\n`;
        txt += `*╚════════════════════╝*\n\n`;
        txt += `> *Enviando audio, espera un momento...*`;

        await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption: txt }, { quoted: m });

        // Cambiamos a una API que suele estar más libre (puedes probar con esta)
        const api = await fetch(`https://api.tostadora.org/api/v1/ytmp3?url=${url}`);
        const res = await api.json();

        if (res.status && res.result.download) {
            await conn.sendMessage(m.chat, { 
                audio: { url: res.result.download }, 
                mimetype: 'audio/mp4', 
                fileName: `${title}.mp3` 
            }, { quoted: m });
            await m.react('✅');
        } else {
            // Si la anterior falla, intentamos con una de respaldo automática
            const backup = await fetch(`https://api.zenkey.my.id/api/download/ytmp3?url=${url}&apikey=zenkey`);
            const res2 = await backup.json();
            
            if (res2.status) {
                await conn.sendMessage(m.chat, { 
                    audio: { url: res2.result.download.url }, 
                    mimetype: 'audio/mp4', 
                    fileName: `${title}.mp3` 
                }, { quoted: m });
                await m.react('✅');
            } else {
                throw new Error('Todas las fuentes de descarga están saturadas.');
            }
        }

    } catch (e) {
        await m.react('✖️');
        console.error(e);
        conn.reply(m.chat, '❌ *Error:* No pude descargar el audio. Intenta de nuevo en unos minutos.', m);
    }
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play', 'play2'];

export default handler;
