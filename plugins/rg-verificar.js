import { createHash } from 'crypto'

// Define tu variable 'club' aquí, reemplázala por lo que quieras mostrar en 'body'
let club = 'Este es el contenido del body que quieres mostrar en la respuesta del anuncio.'

// Define la expresión regular para validar "nombre.edad"
const Reg = /^([^.]*)\.(\d+)$/

// Define la URL de tus redes para el sourceUrl del canal
const redes = "https://instagram.com/tu_perfil" // ¡Reemplázala por tu enlace real!

let handler = async function (m, { conn, text, args, usedPrefix, command }) {
    let user = global.db.data.users[m.sender]
    let name2 = conn.getName(m.sender)
    let whe = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.sender

    let perfil = await conn.profilePictureUrl(whe, 'image').catch(_ => 'https://files.catbox.moe/xr2m6u.jpg')

    if (user.registered === true) {
        return m.reply(`*🍚 Ya te encuentras registrado en mi base de datos.*\n*Si deseas eliminar tu registro usa la función \`#unreg\`*`)
    }

    if (!Reg.test(text)) return m.reply(`*🍚 Por favor, ingresa tu nombre y edad para registrarte en mi base de datos.*\n> *\`Ejemplo:\`*\n> ${usedPrefix + command} ${name2}.20`)

    let [_, name, age] = text.match(Reg) || []
    if (!name) return m.reply('*⚠️ El nombre no puede estar vacío.*')
    if (!age) return m.reply('*⚠️ La edad no puede estar vacía.*')
    if (name.length >= 100) return m.reply('*⚠️ El nombre es demasiado largo.*')

    age = parseInt(age)
    if (age > 1000) return m.reply('*👴🏻 Qué haces acá, no deberías estar en el cementerio?*')
    if (age < 5) return m.reply('*👶🏻 Mirá el bebé quiere jugar al bot*')

    user.name = name.trim()
    user.age = age
    user.regTime = +new Date
    user.registered = true
    global.db.data.users[m.sender].money += 600
    global.db.data.users[m.sender].diamantes += 15
    global.db.data.users[m.sender].exp += 245
    global.db.data.users[m.sender].joincount += 12 // Recompensa de 12 tokens

    let who;
    if (m.quoted && m.quoted.sender) {
        who = m.quoted.sender;
    } else {
        who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;
    }

    let sn = createHash('md5').update(m.sender).digest('hex')
    let regbot = `*\`.･:｡REGISTRO COMPLETO.•:｡\`*\n\n`
    regbot += `- *Nombre:* ${name}\n`
    regbot += `- *Edad:* ${age} años\n\n`
    regbot += `*RECOMPENSAS*\n\n> `
    regbot += `💎 15 Diamantes\n> `
    regbot += `💫 245 Exp\n> `
    regbot += `🎫 12 Tokens\n\n`
    regbot += `> ᥴ᥆ᥣ᥆ᥴᥲ *.profile* ⍴ᥲrᥲ ᥎ᥱr 𝗍ᥙ ⍴ᥱr𝖿іᥣ.`

    // Envía mensaje con un externalAdReply sin usar funciones internas
    await m.react('💌')
    await conn.sendMessage(m.chat, {
        text: regbot,
        contextInfo: {
            externalAdReply: {
                title: '෫໋ׅׄ𝆬🍃ິ⃨ 𝖱𝖾𝗀𝗂𝗌𝗍𝗋𝗈 - 𝖲𝗁𝖺𝖽𝗈𝗐 ׅ𝖴𝗅𝗍𝗋𝖺  ׄ ׄ𑁍̵ ֕︵۪۪۪۪᷼ ּ',
                body: club, // Aquí usamos 'club' definido antes
                thumbnailUrl: 'https://files.catbox.moe/kmfqee.jpg',
                sourceUrl: 'https://whatsapp.com/channel/0029Vb1X1TDElah1FEQ4xm0K',
                mediaType: 1,
                showAdAttribution: true,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });

    // --- Eliminado el envío a canal newsletter para evitar error ---

};

handler.help = ['reg']
handler.tags = ['rg']
handler.command = ['verify', 'verificar', 'reg', 'register', 'registrar']

export default handler
