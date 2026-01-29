import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return conn.reply(m.chat, `*🐱 Ingresa un título de Youtube.*\n\n*🐈 Ejemplo:* ${usedPrefix + command} Corazón Serrano`, m);

    await m.react('🕓');
    try {
        let search = await yts(args.join(" "));
        let video = search.videos[0];
        
        if (!video) {
            await m.react('✖️');
            return conn.reply(m.chat, '*`No se encontraron resultados.`*', m);
        }

        // Extraemos los datos necesarios de forma segura
        const title = video.title;
        const thumbnail = video.thumbnail;
        const timestamp = video.timestamp;
        const author = video.author.name;
        const url = video.url;
        const published = video.ago || 'Reciente';

        let messageText = `*╔═══════『 DESCARGAS 』══════╗*\n`;
        messageText += `*┃* 🏷️ *Título:* ${title}\n`;
        messageText += `*┃* ⌛ *Duración:* ${timestamp}\n`;
        messageText += `*┃* 👤 *Autor:* ${author}\n`;
        messageText += `*┃* 📆 *Publicado:* ${convertTimeToSpanish(published)}\n`;
        messageText += `*┃* 🖇️ *Url:* ${url}\n`;
        messageText += `*╚════════════════════╝*\n\n`;
        messageText += `> *Enviando audio, por favor espera...*`;

        await conn.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: messageText 
        }, { quoted: m });

        // Llamada a la API de descarga
        let res = await fetch(`https://api.lolhuman.xyz/api/ytaudio2?apikey=GataDios&url=${url}`);
        let json = await res.json();

        if (json.status === 200 && json.result) {
            await conn.sendMessage(m.chat, { 
                audio: { url: json.result.link }, 
                mimetype: 'audio/mp4', 
                fileName: `${title}.mp3` 
            }, { quoted: m });
            await m.react('✅');
        } else {
            throw new Error('API Error');
        }

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        conn.reply(m.chat, `*`Error al procesar la solicitud:`*`, m);
    }
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play', 'play2'];

export default handler;

function convertTimeToSpanish(timeText) {
    if (!timeText || typeof timeText !== 'string') return 'Reciente';
    return timeText
        .replace(/year/g, 'año').replace(/years/g, 'años')
        .replace(/month/g, 'mes').replace(/months/g, 'meses')
        .replace(/week/g, 'semana').replace(/weeks/g, 'semanas')
        .replace(/day/g, 'día').replace(/days/g, 'días')
        .replace(/hour/g, 'hora').replace(/hours/g, 'horas')
        .replace(/minute/g, 'minuto').replace(/minutes/g, 'minutos')
        .replace(/ago/g, 'atrás');
}
