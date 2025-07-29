import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import Jimp from "jimp"
import FormData from "form-data"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const handler = async (m, { conn }) => {
  conn.hdr = conn.hdr || {}
  if (m.sender in conn.hdr) {
    return m.reply("✧ Aún hay procesos en el chat >//<")
  }
  conn.hdr[m.sender] = true

  try {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!/^image\/(jpe?g|png)$/.test(mime)) {
      delete conn.hdr[m.sender]
      return m.reply('🪐 Responde a una imagen JPG o PNG.')
    }

    await conn.sendMessage(m.chat, { text: `⏳ Mejorando la calidad de tu imagen, espera un momento...` }, { quoted: m })

    const buffer = await q.download()
    const image = await Jimp.read(buffer)
    image.resize(800, Jimp.AUTO)
    const tmp = path.join(__dirname, `tmp_${Date.now()}.jpg`)
    await image.writeAsync(tmp)

    // Lógica de mejora usando Vyro.AI
    const enhancedBuffer = await enhanceWithVyro(fs.readFileSync(tmp))
    await fs.promises.unlink(tmp)

    await conn.sendFile(m.chat, enhancedBuffer, 'hd.jpg', '', m)
    await conn.sendMessage(m.chat, { text: "✅ Imagen mejorada." }, { quoted: m })
  } catch (err) {
    conn.reply(m.chat, `*Error:* ${err.message}\n > 🕊️.`, m)
  } finally {
    delete conn.hdr[m.sender]
  }
}

handler.help = ['upscale']
handler.tags = ['tools']
handler.command = ['hd', 'remini', 'upscale']

export default handler

async function enhanceWithVyro(imgBuffer) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append("model_version", 1)
    form.append("image", imgBuffer, {
      filename: "enhance_image_body.jpg",
      contentType: "image/jpeg"
    })

    form.submit({
      url: "https://inferenceengine.vyro.ai/enhance",
      host: "inferenceengine.vyro.ai",
      path: "/enhance",
      protocol: "https:",
      headers: {
        "User-Agent": "okhttp/4.9.3",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
      }
    }, (err, res) => {
      if (err) return reject(new Error("Error en la API Vyro."))
      const data = []
      res.on("data", chunk => data.push(chunk))
      res.on("end", () => resolve(Buffer.concat(data)))
      res.on("error", reject)
    })
  })
}
