import fetch from "node-fetch";
import crypto from "crypto";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

const handler = async (m, { conn }) => {
  // Usa mensaje citado si existe, o el mensaje base
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || "";
  if (!mime) return m.reply("No media found");

  // Descarga archivo como buffer
  let media = await q.download();
  if (!media || media.length === 0) return m.reply("No se pudo descargar la imagen.");

  // Valida que sea jpg
  const { ext, mime: bufMime } = (await fileTypeFromBuffer(media)) || {};
  if (ext !== "jpg" && ext !== "jpeg") {
    return m.reply("Solo soporta imágenes en formato JPG.");
  }

  // Sube el archivo
  let link = await catboxJPG(media);

  // Prepara el texto de respuesta
  let caption = `📮 *L I N K :*\n\`\`\`• ${link}\`\`\`\n` +
                `📊 *S I Z E :* ${formatBytes(media.length)}\n` +
                `📛 *E x p i r e d :* No Expiry Date`;

  await m.reply(caption);
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
 * Sube solo imágenes JPG usando el endpoint dado
 * @param {Buffer} buffer Buffer de imagen
 */
async function catboxJPG(content) {
  // Puedes cambiar aquí a la URL de tu servicio exacta
  const UPLOAD_URL = "https://cdn-sunflareteam.vercel.app/";
  const { ext, mime } = (await fileTypeFromBuffer(content)) || { ext: "jpg", mime: "image/jpeg" };

  const blob = new Blob([content], { type: mime });
  const formData = new FormData();
  const randomName = crypto.randomBytes(5).toString("hex");

  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, `${randomName}.${ext}`);

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36"
    },
  });

  if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
  const url = await response.text();
  return url.trim();
}
