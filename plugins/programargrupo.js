import fs from "fs";
import path from "path";
import moment from "moment-timezone";

const schedulePath = path.resolve("./grupo-programacion.json");

// Función para leer configuración guardada
function leerConfig() {
  if (!fs.existsSync(schedulePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(schedulePath, "utf-8"));
  } catch {
    return {};
  }
}

// Función para guardar configuración
function guardarConfig(data) {
  fs.writeFileSync(schedulePath, JSON.stringify(data, null, 2));
}

// Mapa de zonas válidas con sus identificadores TZ
const zonasValidas = {
  méxico: "America/Mexico_City",
  mexico: "America/Mexico_City",
  bogota: "America/Bogota",
  lima: "America/Lima",
  argentina: "America/Argentina/Buenos_Aires",
};

// Función para parsear horas tipo "8:00 am", "22:30", etc.
function parsearHora(textoHora, zona) {
  const zonaTz = zona || zonasValidas["mexico"] || "America/Mexico_City";

  let text = textoHora.toLowerCase().replace(/\s+/g, "");
  let ampm = null;
  if (text.endsWith("am")) {
    ampm = "am";
    text = text.slice(0, -2);
  } else if (text.endsWith("pm")) {
    ampm = "pm";
    text = text.slice(0, -2);
  }

  let [h, m] = text.split(":");
  if (!m) m = "00";
  h = parseInt(h);
  m = parseInt(m);

  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;

  // Retorna objeto moment con la hora y minuto, en la zona indicada, para HOY
  return moment.tz({
    hour: h,
    minute: m,
    second: 0,
  }, zonaTz);
}

// Función para cambiar estado del grupo (abrir o cerrar)
async function setGrupoEstado(bot, chatId, abrir) {
  try {
    // "announcement" = grupos cerrados (solo admins pueden enviar mensajes)
    // "not_announcement" = grupo abierto (todos pueden enviar)
    await bot.groupSettingUpdate(chatId, abrir ? "not_announcement" : "announcement");
  } catch (error) {
    console.error("Error al cambiar estado del grupo:", error);
  }
}

// Función que se debe ejecutar periódicamente para aplicar apertura/cierre
async function verificarYAplicar(bot) {
  const config = leerConfig();
  for (const chatId in config) {
    const { abrirHora, cerrarHora, zona } = config[chatId];
    if (!abrirHora && !cerrarHora) continue;
    const zonaTz = zonasValidas[(zona || "").toLowerCase()] || zonasValidas["mexico"];

    const ahora = moment.tz(zonaTz);

    const abrirMom = abrirHora ? parsearHora(abrirHora, zonaTz).set({
      year: ahora.year(),
      month: ahora.month(),
      date: ahora.date(),
    }) : null;

    const cerrarMom = cerrarHora ? parsearHora(cerrarHora, zonaTz).set({
      year: ahora.year(),
      month: ahora.month(),
      date: ahora.date(),
    }) : null;

    try {
      const metadata = await bot.groupMetadata(chatId);
      const cerrado = metadata.announce; // true si grupo en modo anuncio (cerrado)

      // Lógica para saber si hay que abrir o cerrar:

      // Caso solo abrirHora configurado:
      if (abrirMom && !cerrarMom) {
        if (ahora.isSameOrAfter(abrirMom) && cerrado) {
          await setGrupoEstado(bot, chatId, true);
        } else if (ahora.isBefore(abrirMom) && !cerrado) {
          await setGrupoEstado(bot, chatId, false);
        }
      }

      // Caso solo cerrarHora configurado:
      else if (!abrirMom && cerrarMom) {
        if (ahora.isSameOrAfter(cerrarMom) && !cerrado) {
          await setGrupoEstado(bot, chatId, false);
        } else if (ahora.isBefore(cerrarMom) && cerrado) {
          await setGrupoEstado(bot, chatId, true);
        }
      }

      // Caso ambos configurados:
      else if (abrirMom && cerrarMom) {
        if (abrirMom.isBefore(cerrarMom)) {
          // Abrir entre abrirHora y cerrarHora
          if (ahora.isBetween(abrirMom, cerrarMom, null, '[)') && cerrado) {
            await setGrupoEstado(bot, chatId, true);
          } else if ((!ahora.isBetween(abrirMom, cerrarMom, null, '[)')) && !cerrado) {
            await setGrupoEstado(bot, chatId, false);
          }
        } else {
          // Caso horario que cruza medianoche (ej abrir 22:00, cerrar 06:00)
          if (ahora.isAfter(abrirMom) || ahora.isBefore(cerrarMom)) {
            if (cerrado) await setGrupoEstado(bot, chatId, true);
          } else {
            if (!cerrado) await setGrupoEstado(bot, chatId, false);
          }
        }
      }
    } catch (e) {
      console.error(`Error en verificación-aplicación para grupo ${chatId}:`, e);
    }
  }
}

// Handler del comando programargrupo
const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid;
  if (!chatId.endsWith("@g.us")) return;

  const metadata = await conn.groupMetadata(chatId);
  const sender = msg.key.participant || msg.key.remoteJid;
  const participant = metadata.participants.find(p => p.id === sender);
  const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";

  if (!isAdmin)
    return await conn.sendMessage(chatId, { text: "❌ Solo los administradores pueden usar este comando." }, { quoted: msg });

  if (args.length === 0)
    return await conn.sendMessage(chatId, {
      text: `🌅 *Programación de grupo*\n\n*Uso correcto:*\n» .programargrupo abrir 8:00 am cerrar 10:30 pm\n» .programargrupo zona America/Mexico_City\n\n*Ejemplos:*\n• .programargrupo abrir 7:45 am\n• .programargrupo cerrar 11:15 pm\n• .programargrupo abrir 8:30 am cerrar 10:00 pm\n• .programargrupo zona America/Bogota\n\n⏰ *Puedes usar hora y minutos, y am/pm, y zonas soportadas: México, Bogota, Lima, Argentina`
    }, { quoted: msg });

  let abrirHora = null;
  let cerrarHora = null;
  let zona = null;

  // Parsear argumentos del comando
  for (let i = 0; i < args.length; i++) {
    const arg = args[i].toLowerCase();
    if (arg === "abrir" && i + 1 < args.length) {
      abrirHora = args[i + 1];
      i++;
      if (i + 1 < args.length && (args[i + 1].toLowerCase() === "am" || args[i + 1].toLowerCase() === "pm")) {
        abrirHora += " " + args[i + 1].toLowerCase();
        i++;
      }
    } else if (arg === "cerrar" && i + 1 < args.length) {
      cerrarHora = args[i + 1];
      i++;
      if (i + 1 < args.length && (args[i + 1].toLowerCase() === "am" || args[i + 1].toLowerCase() === "pm")) {
        cerrarHora += " " + args[i + 1].toLowerCase();
        i++;
      }
    } else if (arg === "zona" && i + 1 < args.length) {
      zona = args[i + 1];
      i++;
      if (!zonasValidas[zona.toLowerCase()]) {
        await conn.sendMessage(chatId, { text: `❌ Zona no válida. Zonas soportadas: México, Bogota, Lima, Argentina.` }, { quoted: msg });
        return;
      }
    }
  }

  // Leer configuración existente
  const config = leerConfig();
  if (!config[chatId]) config[chatId] = {};

  if (abrirHora) config[chatId].abrirHora = abrirHora;
  if (cerrarHora) config[chatId].cerrarHora = cerrarHora;
  if (zona) config[chatId].zona = zona;
  else if (!config[chatId].zona) config[chatId].zona = "Mexico"; // default

  guardarConfig(config);

  // Enviar confirmación
  await conn.sendMessage(chatId, {
    text: `✅ Programación actualizada para este grupo:
Abrir: ${config[chatId].abrirHora || "No configurado"}
Cerrar: ${config[chatId].cerrarHora || "No configurado"}
Zona: ${config[chatId].zona}
  
⏰ El bot abrirá y cerrará el grupo automáticamente según esta configuración.`
  }, { quoted: msg });
};

// Exportar handler y la función que debe invocar el bot periódicamente
export { handler, verificarYAplicar };

export default handler;
