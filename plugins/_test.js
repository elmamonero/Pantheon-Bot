import fetch from "node-fetch";
import crypto from "crypto";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

const handler = async (m, { conn }) => {
  try {
    // Obtiene el mensaje citado o el mensaje principal
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";
    if (!mime) return m.reply("No media found");

    // Descarga el archivo como buffer
    let media = await q.download();
    if (!media || media.length === 0) return m.reply("Failed to download media");

    // Sube el archivo a Sunflare
    let link = await sunflareUpload(media);

    // Prepara mensaje con link y tamaño formateado
    let caption = `📮 *L I N K :*\n\`\`\`• ${link}\`\`\`\n` +
                  `📊 *S I Z E :* ${formatBytes(media.length)}\n` +
                  `📛 *E x p i r e d :* No Expiry Date`;

    // Envía el mensaje
    await m.reply(caption);
  } catch (e) {
    console.error(e);
    await m.reply("Error: " + e.message);
  }
};

handler.command = handler.help = ['tourltest'];
handler.tags = ['herramientas'];
handler.register = true;
export default handler;

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Sube el archivo a Sunflare (https://cdn-sunflareteam.vercel.app/)
 * @param {Buffer} content Buffer del archivo
 * @returns {Promise<string>} URL devuelto por el servidor
 */
async function sunflareUpload(content) {
  const { ext, mime } = (await fileTypeFromBuffer(content)) || { ext: "bin", mime: "application/octet-stream" };
  
  // Crear un Blob a partir del buffer y MIME type
  const blob = new Blob([content], { type: mime });
  const formData = new FormData();
  const randomName = crypto.randomBytes(5).toString("hex");

  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, `${randomName}.${ext}`);

  const response = await fetch("https://cdn-sunflareteam.vercel.app/", {
    method: "POST",
    body: formData,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
      // No se especifica content-type porque fetch lo pone automáticamente con FormData
    },
  });

  if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);

  const url = await response.text();
  return url.trim();
}
