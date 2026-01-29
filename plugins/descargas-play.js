import yts from 'yt-search';
import fetch from 'node-fetch';

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return conn.reply(m.chat, '*🐱 Ingresa el nombre de la canción.*', m);

    await m.react('🕓');
    try {
        let search = await yts(args.join(" "));
        let video = search.videos[0];
        if (!video) return conn.reply(m.chat, '*No se encontraron resultados.*', m);

        const { title, thumbnail, url, timestamp, author } = video;

        await conn.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: `*📌 Título:* ${title}\n*⌛ Duración:* ${timestamp}\n*👤 Autor:* ${author.name}\n\n> *Buscando en servidores premium...*`
        }, { quoted: m });

        // LISTA DE APIS ACTUALIZADAS 2026
        const apiSources = [
            `https://api.debx.site/api/v1/ytmp3?url=${url}`,
            `https://api.vreden.my.id/api/ytmp3?url=${url}`,
            `https://api.neoxr.eu/api/youtube?url=${url}`,
            `https://api.miftah.my.id/api/download/ytmp3?url=${url}`,
            `https://api.yanzbotz.my.id/api/downloader/ytmp3?url=${url}`
        ];

        let success = false;
        for (let api of apiSources) {
            try {
                let res = await fetch(api);
                let json = await res.json();
                
                // Las APIs modernas suelen guardar el link en diferentes lugares
                let dl = json.result?.url || json.result?.download || json.data?.url || json.data?.link || json.url;

                if (dl) {
                    await conn.sendMessage(m.chat, {
                        audio: { url: dl },
                        mimetype: 'audio/mp4',
                        fileName: `${title}.mp3`
                    }, { quoted: m });
                    success = true;
                    await m.react('✅');
                    break; 
                }
            } catch (e) {
                console.log(`Fallo en: ${api}`);
                continue; 
            }
        }

        if (!success) {
            // ÚLTIMO RECURSO: API de descarga directa de emergencia
            let emergency = await fetch(`https://api.darky.me/api/ytmp3?url=${url}`);
            let emJson = await emergency.json();
            if (emJson.url) {
                await conn.sendMessage(m.chat, { audio: { url: emJson.url }, mimetype: 'audio/mp4' }, { quoted: m });
                await m.react('✅');
                success = true;
            }
        }

        if (!success) throw new Error('Servidores fuera de servicio.');

    } catch (e) {
        await m.react('✖️');
        conn.reply(m.chat, `*❌ Error total:* Intenta de nuevo en unos minutos o usa un nombre más corto.`, m);
    }
};

handler.command = ['play'];
export default handler;
