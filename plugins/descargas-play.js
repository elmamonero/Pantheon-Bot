import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    // 1. Validación de entrada
    if (!args[0]) return conn.reply(m.chat, `*🐱 Ingresa un título de Youtube.*\n\n*🐈 Ejemplo:* ${usedPrefix + command} Corazón Serrano`, m);

    await m.react('🕓');
    try {
        // 2. Búsqueda con yt-search
        let search = await yts(args.join(" "));
        let video = search.videos[0];
        if (!video) {
            await m.react('✖️');
            return conn.reply(m.chat, '*`No se encontraron resultados.`*', m);
        }

        const { title, thumbnail, timestamp, author, url, ago } = video;

        // 3. Diseño del mensaje inforsmativo
        let messageText = `*╔═══════『 DESCARGAS 』══════╗*\n`;
        messageText += `*┃* 🏷️ *Título:* ${title}\n`;
        messageText += `*┃* ⌛ *Duración:* ${timestamp}\n`;
        messageText += `*┃* 👤 *Autor:* ${author.name}\n`;
        messageText += `*┃* 📆 *Publicado:* ${convertTimeToSpanish(ago)}\n`;
        messageText += `*┃* 🖇️ *Url:* ${url}\n`;
        messageText += `*╚════════════════════╝*\n\n`;
        messageText += `> *Enviando audio, por favor espera...*`;

        // 4. Enviar la miniatura con la información
        await conn.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: messageText 
        }, { quoted: m });

        // 5. Proceso de descarga (Consumiendo la API para obtener el archivo)
        // Usamos la API de Lolhuman con una apikey pública común
        let res = await fetch(`https://api.lolhuman.xyz/api/ytaudio2?apikey=GataDios&url=${url}`);
        let json = await res.json();

        if (json.status !== 200 || !json.result) {
            throw new Error('La API de descarga no pudo procesar el video.');
        }

        // 6. Envío del archivo de audio final
        await conn.sendMessage(m.chat, { 
            audio: { url: json.result.link }, 
            mimetype: 'audio/mp4', 
            fileName: `${title}.mp3` 
        }, { quoted: m });

        await m.react('✅');

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        conn.reply(m.chat, `*`Error al procesar la solicitud:`*\n${e.message}`, m);
    }
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play', 'play2'];

export default handler;

// Funciones auxiliares
function convertTimeToSpanish(timeText) {
    if (!timeText) return 'Reciente';
    return timeText
        .replace(/year/g, 'año').replace(/years/g, 'años')
        .replace(/month/g, 'mes').replace(/months/g, 'meses')
        .replace(/day/g, 'día').replace(/days/g, 'días')
        .replace(/hour/g, 'hora').replace(/hours/g, 'horas')
        .replace(/minute/g, 'minuto').replace(/minutes/g, 'minutos')
        .replace(/ago/g, 'atrás');
}
