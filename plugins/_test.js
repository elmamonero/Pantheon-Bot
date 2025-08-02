import fetch from "node-fetch";
import crypto from "crypto";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

const handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || "";
  if (!mime) return m.reply("No media found");

  let media = await q.download();
  if (!media || media.length === 0) return m.reply("No se pudo descargar la imagen.");

  // Solo JPG
  const { ext, mime: realMime } = (await fileTypeFromBuffer(media)) || {};
  if (ext !== "jpg" && ext !== "jpeg") {
    return m.reply("Solo se admiten imágenes JPG.");
  }

  try {
    const blob = new Blob([media], { type: realMime });
    const formData = new FormData();
    const randomName = crypto.randomBytes(5).toString("hex");
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", blob, `${randomName}.${ext}`);

    const response = await fetch("https://cdn-sunflareteam.vercel.app/", {
      method: "POST",
      body: formData,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) return m.reply(`Error: Upload failed with status ${response.status}`);

    const url = (await response.text()).trim();
    let caption = `📮 *L I N K :*\n\`\`\`• ${url}\`\`\`\n` +
                  `📊 *S I Z E :* ${formatBytes(media.length)}\n` +
                  `📛 *E x p i r e d :* No Expiry Date`;

    await m.reply(caption);
  } catch (e) {
    await m.reply("Error subiendo: " + (e.message || e));
  }
};

handler.command = handler.help = ["tourltest"];
handler.tags = ["herramientas"];
handler.register = true;
export default handler;

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}
