import sharp from "sharp"
import fetch from "node-fetch"
import FormData from "form-data"

const handler = async (m, { conn }) => {
  try {
    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!/^image\/(jpe?g|png)$/.test(mime)) {
      return m.reply('🪐 Responde a una imagen JPG o PNG.')
    }

    await conn.sendMessage(m.chat, { text: "⏳ Mejorando Su Imagen Espere Un Momento." }, { quoted: m })

    const buffer = await q.download()
    // Redimensionar sin guardar a disco
    const resizedImage = await sharp(buffer)
      .resize(800)
      .toFormat('jpeg')
      .toBuffer()

    // Subir usando FormData directamente desde Buffer
    const form = new FormData()
    form.append("files[]", resizedImage, { filename: `img_${Date.now()}.jpg` })

    const res = await fetch("https://uguu.se/upload.php", {
      method: "POST",
      headers: form.getHeaders(),
      body: form
    })

    const json = await res.json()
    const pene = json.files?.[0]?.url
    if (!pene) throw new Error('La subida a Uguu falló.')

    const enhanced = await upscaleImage(pene)
    await conn.sendFile(m.chat, enhanced, 'hd.jpg', '', m)
    await conn.sendMessage(m.chat, { text: "✅ Imagen mejorada." }, { quoted: m })

  } catch (err) {
    conn.reply(m.chat, `*Error:* ${err.message}\n > 🕊️.`, m)
  }
}

async function upscaleImage(url) {
  const res = await fetch(`https://api.siputzx.my.id/api/iloveimg/upscale?image=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error("No se pudo mejorar la imagen.")
  return await res.buffer()
}

export default handler
