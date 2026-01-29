import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    // Verificamos que el usuario ingrese un título o búsqueda
    if (!args[0]) return conn.reply(m.chat, '*🐱 Ingresa el nombre de la canción.*\n\n*🐈 Ejemplo:* ' + usedPrefix + command + ' Corazón Serrano - Mix Poco Yo', m);

    await m.react('🕓');
    try {
        // Realiza la búsqueda en YouTube
        let search = await yts(args.join(" "));
        let video = search.videos[0];

        if (!video) {
            await m.react('✖️');
            return conn.reply(m.chat, '*`No se encontraron resultados.`*', m);
        }

        const { title, thumbnail, timestamp, author, url, ago } = video;
        
        // Obtenemos la miniatura
        let response = await fetch(thumbnail);
        let imageBuffer = await response.buffer();

        // Estructura de texto informativa
        let messageText = `\`YOUTUBE - MP3\`\n\n`;
        messageText += `*📌 Título:* ${title}\n`;
        messageText += `*⌛ Duración:* ${timestamp}\n`;
        messageText += `*👤 Autor:* ${author.name}\n`;
        messageText += `*📆 Publicado:* ${convertTimeToSpanish(ago)}\n`;
        messageText += `*🖇️ Url:* ${url}\n\n`;
        messageText += `> *Enviando audio, por favor espera...*`;

        // Enviamos la información del video
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

        // Proceso de descarga automática de MP3
        // Intentamos con la API primaria
        let downloadRes = await fetch(`https://api.lolhuman.xyz/api/ytaudio2?apikey=GataDios&url=${url}`);
        let json = await downloadRes.json();

        if (json.status === 200 && json.result.link) {
            await conn.sendMessage(m.chat, {
                audio: { url: json.result.link },
                mimetype: 'audio/mp4',
                fileName: title + '.mp3'
            }, { quoted: m });
            await m.react('✅');
        } else {
            // Intento con API de respaldo si la primera falla o está saturada
            let backupRes = await fetch(`https://api.zenkey.my.id/api/download/ytmp3?url=${url}&apikey=zenkey`);
            let backupJson = await backupRes.json();
            
            if (backupJson.status && backupJson.result.download.url) {
                await conn.sendMessage(m.chat, {
                    audio: { url: backupJson.result.download.url },
                    mimetype: 'audio/mp4',
                    fileName: title + '.mp3'
                }, { quoted: m });
                await m.react('✅');
            } else {
                throw new Error('Servidores de audio ocupados.');
            }
        }

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        conn.reply(m.chat, '*`Error al enviar el audio:`* ' + e.message, m);
    }
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play']; // Solo responde a .play

export default handler;

// Función de traducción para la fecha de publicación
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
