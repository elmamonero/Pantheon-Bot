import yts from 'yt-search';
import axios from 'axios';
import crypto from 'crypto';

// --- SISTEMA DE EXTRACCIÓN OGMP3 (El que encontraste) ---
const ogmp3 = {
    api: { base: 'https://api3.apiapi.lat', endpoints: { a: 'https://api5.apiapi.lat', b: 'https://api.apiapi.lat', c: 'https://api3.apiapi.lat' } },
    headers: { authority: 'api.apiapi.lat', 'content-type': 'application/json', origin: 'https://ogmp3.lat', referer: 'https://ogmp3.lat/', 'user-agent': 'Postify/1.0.0' },
    utils: {
        hash: () => {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
        },
        encoded: (str) => {
            let result = '';
            for (let i = 0; i < str.length; i++) result += String.fromCharCode(str.charCodeAt(i) ^ 1);
            return result;
        },
        enc_url: (url, separator = ',') => {
            const codes = [];
            for (let i = 0; i < url.length; i++) codes.push(url.charCodeAt(i));
            return codes.join(separator).split(separator).reverse().join(separator);
        }
    },
    request: async (endpoint, data = {}, method = 'post') => {
        const ae = Object.values(ogmp3.api.endpoints);
        const be = ae[Math.floor(Math.random() * ae.length)];
        const fe = endpoint.startsWith('http') ? endpoint : `${be}${endpoint}`;
        const { data: response } = await axios({ method, url: fe, data: method === 'post' ? data : undefined, headers: ogmp3.headers });
        return response;
    },
    download: async (link) => {
        const c = ogmp3.utils.hash();
        const d = ogmp3.utils.hash();
        const req = {
            data: ogmp3.utils.encoded(link),
            format: '0', // 0 = audio
            referer: 'https://ogmp3.cc',
            mp3Quality: '320',
            userTimeZone: '-360'
        };
        const resx = await ogmp3.request(`/${c}/init/${ogmp3.utils.enc_url(link)}/${d}/`, req);
        if (resx.s === 'C') return `${ogmp3.api.base}/${ogmp3.utils.hash()}/download/${ogmp3.utils.encoded(resx.i)}/${ogmp3.utils.hash()}/`;
        
        // Si no está listo, chequeamos estatus (resumen del loop)
        const check = await ogmp3.request(`/${ogmp3.utils.hash()}/status/${ogmp3.utils.encoded(resx.i)}/${ogmp3.utils.hash()}/`, { data: resx.i });
        return `${ogmp3.api.base}/${ogmp3.utils.hash()}/download/${ogmp3.utils.encoded(check.i)}/${ogmp3.utils.hash()}/`;
    }
};

// --- HANDLER DEL BOT ---
const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return conn.reply(m.chat, '*🐱 Ingresa el nombre de la canción.*', m);

    await m.react('🕓');
    try {
        let search = await yts(args.join(" "));
        let video = search.videos[0];
        if (!video) return conn.reply(m.chat, '*No encontré nada.*', m);

        const { title, thumbnail, url, timestamp, author } = video;

        // Enviar info inicial
        await conn.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: `*📌 Título:* ${title}\n*⌛ Duración:* ${timestamp}\n*👤 Autor:* ${author.name}\n\n> *Descargando mediante OGMP3 Engine...*`
        }, { quoted: m });

        // USAR EL SCRAPER QUE ENCONTRASTE
        const dlUrl = await ogmp3.download(url);

        if (dlUrl) {
            await conn.sendMessage(m.chat, {
                audio: { url: dlUrl },
                mimetype: 'audio/mp4',
                fileName: `${title}.mp3`
            }, { quoted: m });
            await m.react('✅');
        } else {
            throw new Error();
        }

    } catch (e) {
        console.error(e);
        await m.react('✖️');
        conn.reply(m.chat, `*❌ Error:* El servidor OGMP3 no respondió. Intenta de nuevo.`, m);
    }
};

handler.command = ['play'];
export default handler;
