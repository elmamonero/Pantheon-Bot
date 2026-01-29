import yts from 'yt-search';
import { exec } from 'yt-dlp-exec'; // Usaremos el binario directamente
import fs from 'fs';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return conn.reply(m.chat, '*🐱 Ingresa el nombre de la canción.*', m);

    await m.react('🕓');
    
    try {
        // 1. Búsqueda
        let search = await yts(args.join(" "));
        let video = search.videos[0];
        if (!video) return conn.reply(m.chat, '*No se encontraron resultados.*', m);

        const { title, url, thumbnail } = video;
        const fileName = `./tmp/${Date.now()}.mp3`;

        // Informar al usuario
        await conn.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: `*📌 Título:* ${title}\n\n> *Procesando audio localmente...*` 
        }, { quoted: m });

        // 2. Descarga Local usando yt-dlp
        // Esto descarga el audio directamente de YouTube a tu carpeta local
        await exec(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: fileName,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:googlebot']
        });

        // 3. Enviar el archivo descargado
        await conn.sendMessage(m.chat, { 
            audio: fs.readFileSync(fileName), 
            mimetype: 'audio/mp4', 
            fileName: `${title}.mp3` 
        }, { quoted: m });

        // 4. Limpieza (Borrar archivo temporal para no llenar el disco)
        fs.unlinkSync(fileName);
        await m.react('✅');

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        conn.reply(m.chat, `*Error Crítico:* El sistema de descarga local falló.`, m);
    }
};

handler.command = ['play'];
export default handler;
