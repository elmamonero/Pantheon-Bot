import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    // Verificamos si hay texto después del comando
    if (!args[0]) return conn.reply(m.chat, `*🐱 Ingresa un título de Youtube.*\n\n*🐈 Ejemplo:* ${usedPrefix + command} Corazón Serrano - Mix Poco Yo`, m);

    await m.react('🕓');
    try {
        // Realizamos la búsqueda
        let search = await yts(args.join(" "));
        let video = search.videos[0];

        if (!video) {
            await m.react('✖️');
            return conn.reply(m.chat, '*`No se encontraron resultados.`*', m);
        }

        const { title, thumbnail, timestamp, author, url, ago } = video;
        let imageBuffer = await (await fetch(thumbnail)).buffer();

        // Texto informativo (Estructura similar a tu primer código)
        let messageText = `\`DESCARGAS - PLAY\`\n\n`;
        messageText += `*📌 Título:* ${title}\n`;
        messageText += `*⌛ Duración:* ${timestamp}\n`;
        messageText += `*👤 Autor:* ${author.name}\n`;
        messageText += `*📆 Publicado:* ${convertTimeToSpanish(ago)}\n`;
        messageText += `*🖇️ Url:* ${url}\n\n`;
        messageText += `*Escribe el comando para descargar:* \n`;
        messageText += `> *${usedPrefix}ytmp3* ${url}\n`;
        messageText += `> *${usedPrefix}ytmp4* ${url}`;

        // Enviamos la imagen con la información
        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: messageText,
            contextInfo: {
                externalAdReply: {
                    showAdAttribution: true,
                    title: title,
                    body: author.name,
                    thumbnail: imageBuffer,
                    sourceUrl: url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });

        await m.react('✅');

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        conn.reply(m.chat, '*`Error al buscar el video.`*', m);
    }
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play', 'play2'];

export default handler;

// Función para traducir el tiempo (mejorada para que no dé error de sintaxis)
function convertTimeToSpanish(timeText) {
    if (!timeText) return 'Reciente';
    return timeText
        .replace(/year/g, 'año').replace(/years/g, 'años')
        .replace(/month/g, 'mes').replace(/months/g, 'meses')
        .replace(/week/g, 'semana').replace(/weeks/g, 'semanas')
        .replace(/day/g, 'día').replace(/days/g, 'días')
        .replace(/hour/g, 'hora').replace(/hours/g, 'horas')
        .replace(/minute/g, 'minuto').replace(/minutes/g, 'minutos')
        .replace(/ago/g, 'atrás');
}
