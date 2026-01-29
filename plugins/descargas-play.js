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
            caption: `*📌 Título:* ${title}\n*⌛ Duración:* ${timestamp}\n*👤 Autor:* ${author.name}\n\n> *Buscando servidor disponible...*`
        }, { quoted: m });

        // LISTA DE APIS DE RESPALDO (Si una cae, usa la otra)
        const apiSources = [
            `https://api.siputzx.my.id/api/d/ytmp3?url=${url}`,
            `https://api.zenkey.my.id/api/download/ytmp3?url=${url}&apikey=zenkey`,
            `https://api.lolhuman.xyz/api/ytaudio2?apikey=GataDios&url=${url}`,
            `https://api.agungny.my.id/api/youtube-audio?url=${url}`,
            `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${url}`
        ];

        let success = false;
        for (let api of apiSources) {
            try {
                let res = await fetch(api);
                let json = await res.json();
                
                // Extraer el link sin importar cómo se llame en el JSON
                let dl = json.result?.link || json.result?.download?.url || json.data?.url || json.url || json.link;

                if (dl) {
                    await conn.sendMessage(m.chat, {
                        audio: { url: dl },
                        mimetype: 'audio/mp4',
                        fileName: `${title}.mp3`
                    }, { quoted: m });
                    success = true;
                    await m.react('✅');
                    break; // Salir del bucle si funcionó
                }
            } catch (e) {
                console.log(`Fallo en: ${api}`);
                continue; // Probar la siguiente API
            }
        }

        if (!success) throw new Error('Todos los servidores están caídos.');

    } catch (e) {
        await m.react('✖️');
        conn.reply(m.chat, `*❌ Error total:* No se pudo obtener el audio de ninguna fuente.`, m);
    }
};

handler.command = ['play'];
export default handler;
