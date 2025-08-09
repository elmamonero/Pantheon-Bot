import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";

const handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || "";
  if (!mime) return m.reply("No media found", null, { quoted: fkontak });

  // Descargar media
  let media = await q.download();

  // Subir a la nueva API
  let link = await uploadToCustomAPI(media);

  let caption = `📮 *L I N K :*\n\`\`\`• ${link}\`\`\`\n📊 *S I Z E :* ${formatBytes(media.length)}\n📛 *E x p i r e d :* "No Expiry Date"`;

  await m.reply(caption);
};

handler.command = handler.help = ["tourltest5"];
handler.tags = ["herramientas"];
handler.register = true;
export default handler;

// Formato para tamaño en bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Subir buffer a upload.php personalizado
 * @param {Buffer} content Buffer del archivo a subir
 * @returns {Promise<string>} URL o link devuelto por el servidor
 */
async function uploadToCustomAPI(content) {
  const blob = new Blob([content.toArrayBuffer()]);
  const formData = new FormData();

  // El nombre del campo 'file' puede cambiar según el backend
  formData.append("file", blob, "uploadfile");

  const response = await fetch("https://cdn.russellxz.click/upload.php", {
    method: "POST",
    body: formData,
    // No se recomienda setear Content-Type para FormData, fetch lo maneja automáticamente
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Error en subida: ${response.status} ${response.statusText}`);
  }

  // Puede que el servidor responda con texto plano o JSON; ajusta según corresponda
  const text = await response.text();

  // En caso de que retorne un JSON con url, puedes hacer:
  // const result = await response.json();
  // return result.url;

  return text; // devuelvo texto directo; revisa qué devuelve upload.php para ajustar
}
