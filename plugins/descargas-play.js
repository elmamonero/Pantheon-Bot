import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return conn.reply(m.chat, '*🐱 Ingresa un título de Youtube.*\n\n*🐈 Ejemplo:* ' + usedPrefix + command + ' Corazón Serrano', m);

    await m.react('🕓');
    try {
        const search = await yts(args.join(" "));
        const video = search.videos[0];
        
        if (!video) {
            await m.react('✖️');
            return conn.reply(m.chat, '*No se encontraron resultados.*', m);
        }

        const { title, thumbnail, timestamp, url } = video;

        let messageText = `*╔═══════『 DESCARGAS 』══════╗*\n`;
        messageText += `*┃* 🏷️ *Título:* ${title}\n`;
        messageText += `*┃* ⌛ *Duración:* ${timestamp}\n`;
        messageText += `*┃* 🖇️ *Url:* ${url}\n`;
        messageText += `*╚════════════════════╝*\n\n`;
        messageText += `> *Enviando audio, espera un momento...*`;

        await conn.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: messageText 
        }, { quoted: m });

        // Intentamos descargar el audio
        let res = await fetch(`https://api.lolhuman.xyz/api/ytaudio2?apikey=GataDios&url=${url}`);
        let json = await res.json();

        if (json.status === 200 && json.result.link) {
            await conn.sendMessage(m.chat, { 
                audio: { url: json.result.link }, 
                mimetype: 'audio/mp4', 
                fileName: title + '.mp3' 
            }, { quoted: m });
            await m.react('✅');
        } else {
            throw new Error('API bloqueada o saturada');
        }

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        // He quitado las comillas invertidas conflictivas aquí:
        conn.reply(m.chat, 'Error: ' + e.message, m);
    }
};

handler.help = ['play'];
handler.tags = ['descargas'];
handler.command = ['play', 'play2'];

export default handler;
