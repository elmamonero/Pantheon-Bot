import fetch from "node-fetch";
import crypto from "crypto";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

const handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || "";
  if (!mime) return m.reply("No media found");
  
  let media = await q.download();
  let link = await sunflareUpload(media);
  
  let caption = `📮 *L I N K :*
\`\`\`• ${link}\`\`\`
📊 *S I Z E :* ${formatBytes(media.length)}
📛 *E x p i r e d :* No Expiry Date
`;

  await m.reply(caption);
}
handler.command = handler.help = ['tourltest']
handler.tags = ['herramientas']
handler.register = true
export default handler


function formatBytes(bytes) {
  if (bytes === 0) {
    return "0 B";
  }
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Upload file to sunflare CDN
 * Supported mimetype same as before
 * @param {Buffer} content File buffer
 * @returns {Promise<string>} URL string
 */
async function sunflareUpload(content) {
  const { ext, mime } = (await fileTypeFromBuffer(content)) || { ext: "bin", mime: "application/octet-stream" };

  // Create blob from buffer
  const blob = new Blob([content], { type: mime });
  const formData = new FormData();
  const randomBytes = crypto.randomBytes(5).toString("hex");
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, `${randomBytes}.${ext}`);

  const response = await fetch("https://cdn-sunflareteam.vercel.app/", {
    method: "POST",
    body: formData,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
    },
  });

  if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);

  const text = await response.text();

  // Sunflare presumably returns URL directly as plain text, if no JSON response
  return text.trim();
}
