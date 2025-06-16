/*import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { tmpdir } from 'os';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchSticker = async (text, attempt = 1) => {
    try {
        const response = await axios.get('https://vapis.my.id/api/bratv1', {
            params: { q: text },
            responseType: 'arraybuffer',
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 429 && attempt <= 3) {
            const retryAfter = error.response.headers['retry-after'] || 5;
            await delay(retryAfter * 1000);
            return fetchSticker(text, attempt + 1);
        }
        throw error;
    }
};

const handler = async (m, { text, conn }) => {
    if (!text) {
        return conn.reply(m.chat, `*${xsticker} Por favor, ingresa un texto para realizar tu sticker.*`, m, rcanal);
    }

    try {
        const buffer = await fetchSticker(text);
        const outputFilePath = path.join(tmpdir(), `sticker-${Date.now()}.webp`);
        await sharp(buffer)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 },
            })
            .webp({ quality: 80 })
            .toFile(outputFilePath);

        await conn.sendMessage(m.chat, {
            sticker: { url: outputFilePath },
        }, { quoted: fkontak });

        fs.unlinkSync(outputFilePath);
    } catch (error) {
        console.error(error);
        return conn.sendMessage(m.chat, {
            text: '*✖️ Error de la API.*',
        }, { quoted: m });
    }
};

handler.command = ['brat'];
handler.tags = ['sticker'];
handler.help = ['brat'];

export default handler;*/
