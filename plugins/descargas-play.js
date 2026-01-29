import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args }) => {
    if (!args[0]) return conn.reply(m.chat, '*🐱 Ingresa el nombre de la canción.*', m);

    await m.react('🕓');
    try {
        let search = await yts(args.join(" "));
        let video = search.videos[0];
        if (!video) return conn.reply(m.chat, '*No se encontraron resultados.*', m);

        const { title, thumbnail, url, timestamp, author } = video;

        await conn.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: `*📌 Título:* ${title}\n*👤 Autor:* ${author.name}\n\n> *Descargando audio, por favor espera...*`
        }, { quoted: m });

        // Intentamos con un motor de conversión directo (yt1s / y2mate proxy)
        const res = await fetch(`https://api.shizuka.site/y2mate?url=${url}`);
        const data = await res.json();

        // Buscamos el link de audio en la respuesta
        // Si esta API falla, usamos una de respaldo inmediato en el mismo código
        let downloadUrl = data.links?.mp3?.['128kbps']?.url || data.result;

        if (!downloadUrl) {
            // RESPALDO: API de descarga tipo Bypass
            const res2 = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${url}`);
            const data2 = await res2.json();
            downloadUrl = data2.data?.url || data2.result;
        }

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
        conn.reply(m.chat, `*❌ Error:* Los servidores de YouTube están rechazando la conexión del hosting. Intenta buscar por el *link directo* del video.`, m);
    }
};

handler.command = ['play'];
export default handler;
