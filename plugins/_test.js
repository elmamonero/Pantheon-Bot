import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";

const handler = async (m, { conn }) => {
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";
    if (!mime) return m.reply("No media found", null, { quoted: fkontak });

    // Descarga el archivo enviado
    let media = await q.download();

    // Sube el archivo a la nueva API
    let link = await uploadToCustomAPI(media);

    let caption = `📮 *L I N K :*\n\`\`\`• ${link}\`\`\`\n📊 *S I Z E :* ${formatBytes(media.length)}\n📛 *E x p i r e d :* "No Expiry Date"`;

    await m.reply(caption);
  } catch (error) {
    console.error("Error en handler:", error);
    await m.reply("Hubo un error subiendo el archivo.");
  }
};

handler.command = handler.help = ["tourltest5"];
handler.tags = ["herramientas"];
handler.register = true;
export default handler;

// Función para formatear bytes legibles
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Función para subir el buffer de un archivo al upload.php personalizado
 * @param {Buffer} content Buffer del archivo a subir
 * @returns {Promise<string>} URL o respuesta que retorna el servidor
 */
async function uploadToCustomAPI(content) {
  const blob = new Blob([content.toArrayBuffer()]);
  const formData = new FormData();

  // El campo 'file' debe coincidir con lo que el backend espera
  formData.append("file", blob, "uploadfile");

  const response = await fetch("https://cdn.russellxz.click/upload.php", {
    method: "POST",
    body: formData,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Error en subida: ${response.status} ${response.statusText}`);
  }

  // Asumimos que la respuesta es texto plano con el link
  const text = await response.text();

  // Aquí puedes parsear el texto si es JSON o extraer la URL

  return text;
}
