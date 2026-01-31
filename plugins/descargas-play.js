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
            caption: `*📌 Título:* ${title}\n*👤 Autor:* ${author.name}\n\n> *Descargando desde servidor estable...*`
        }, { quoted: m });

        // Intentamos con una secuencia de APIs más modernas y estables
        const providers = [
            `https://api.alyachan.dev/api/ytmp3?url=${url}`,
            `https://api.betabotz.eu.org/api/download/ytmp3?url=${url}&apikey=beta-pitu`,
            `https://api.caliph.biz.id/api/ytmp3?url=${url}`,
            `https://api.boxmine.xyz/api/v1/ytmp3?url=${url}`
        ];

        let downloadUrl = null;

        for (let api of providers) {
            try {
                const res = await fetch(api);
                if (!res.ok) continue;
                const data = await res.json();
                
                // Extraer link (cada API lo llama distinto)
                downloadUrl = data.result?.url || data.result?.download?.url || data.data?.url || data.url;
                
                if (downloadUrl) break; // Si encontramofs uno, salimos del bucle
            } catch (e) {
                console.log(`Fallo en: ${api}`);
            }
        }

        if (downloadUrl) {
            await conn.sendMessage(m.chat, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mp4',
                fileName: `${title}.mp3`
            }, { quoted: m });
            await m.react('✅');
        } else {
            throw new Error('Todos los servidores de descarga fallaron.');
        }

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        conn.reply(m.chat, `*❌ Error Crítico:* Tu hosting está bloqueando las conexiones salientes o las APIs están en mantenimiento.`, m);
    }
};

handler.command = ['play'];
export default handler;
