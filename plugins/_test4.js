import { createHash } from 'crypto'

// Define tu variable 'club' aquí, reemplázala por lo que quieras mostrar en 'body'
let club = 'Este es el contenido del body que quieres mostrar en la respuesta del anuncio.'

let handler = async function (m, { conn, text, args, usedPrefix, command }) {
    let user = global.db.data.users[m.sender]
    let name2 = conn.getName(m.sender)
    let whe = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.sender

    let perfil = await conn.profilePictureUrl(whe, 'image').catch(_ => 'https://files.catbox.moe/xr2m6u.jpg')

    if (user.registered === true) {
        return m.reply(`*🍚 Ya te encuentras registrado en mi base de datos.*\n*Si deseas eliminar tu registro use la función \`#unreg\`*`)
    }

    if (!Reg.test(text)) return m.reply(`*🍚 Por favor, ingresa tu nombre y edad para registrarte en mi base de datos.*\n> *\`Ejemplo:\`*\n> ${usedPrefix + command} ${name2}.20`)

    let [_, name, splitter, age] = text.match(Reg)
    if (!name) return m.reply('*⚠️ El nombre no puede estar vacío pendejo.*')
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
    global.db.data.users[m.sender].joincount += 5    

    let who;
    if (m.quoted && m.quoted.sender) {
        who = m.quoted.sender;
    } else {
        who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;
    }

    let sn = createHash('md5').update(m.sender).digest('hex')
    let regbot = `𐙚ㅤ *𝖱𝖾︩𝗀𝗂𝗌𝗍𝗋𝗈* ㅤﾉㅤ *𝖢𝗈𝗆𝗉𝗅𝖾ł𝗈* ㅤᗝ̵\nㅤ꒰       ֹ      ﹙᷼͝sʜᴀᴅᴏᴡ᷼͝﹚       ִ       ꒱\n\n`
    regbot += `✿᷎︩︪͡⪧ \`Nombre:\` ${name}\n`
    regbot += `✿᷎︩︪͡⪧ \`Edad:\` ${age} años\n\n`
    regbot += `𐔌𐔌  *𝖱𝖾𝖼໊𝗈𝗆͟𝗉͟𝖾͟𝗇͟𝗌͟𝖺𝗌 ࣲ* ׅ  ☕ᩨ   ׄ\n\n`
    regbot += `ᦷᩘᦷ     ݂   💎 ፡ \`\`\`15 Diamantes\`\`\`\n`
    regbot += `ᦷᩘᦷ     ݂   🍸 ፡ \`\`\`245 Xp\`\`\`\n`
    regbot += `ᦷᩘᦷ     ݂   🎫 ፡ \`\`\`12 Tokens\`\`\`\n\n`
    regbot += `> 𝖢𝗈𝗅𝗈𝖼𝖺 *#profile* 𝗉𝖺𝗋𝖺 𝗏𝖾𝗋 𝗍𝗎 𝗉𝖾𝗋𝖿𝗂𝗅`

    // Envía mensaje con un externalAdReply sin usar funciones internas
    await m.react('💌')
    await conn.sendMessage(m.chat, {
        text: regbot,
        contextInfo: {
            externalAdReply: {
                title: '෫໋ׅׄ𝆬🍃ິ⃨ 𝖱𝖾𝗀𝗂𝗌𝗍𝗋𝗈 - 𝖲𝗁𝖺𝖽𝗈𝗐 ׅ𝖴𝗅𝗍𝗋𝖺  ׄ ׄ𑁍̵ ֕︵۪۪۪۪᷼ ּ',
                body: club, // Aquí usamos 'club' definido antes
                thumbnailUrl: 'https://files.catbox.moe/nwqdwh.jpg',
                sourceUrl: 'https://whatsapp.com/channel/0029Vb1X1TDElah1FEQ4xm0K',
                mediaType: 1,
                showAdAttribution: true,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m }); // Usa 'm' en vez de 'fkontak', a menos que sea específico

let chtxt = `👤 *𝚄𝚂𝙴𝚁:* ${m.pushName || 'Anónimo'}
☕ *𝚁𝙴𝙶𝙸𝚂𝚃𝚁𝙾:* ${user.name}
🤍 *𝙴𝙳𝙰𝙳:* ${user.age} años
📝 *𝙳𝙴𝚂𝙲:* ${user.descripcion}
🪪 *𝚂𝙴𝚁𝙸𝙴:*
⤷ ${sn}`;

    let channelID = '120363384854309225@newsletter';
    await conn.sendMessage(channelID, {
        text: chtxt,
        contextInfo: {
            externalAdReply: {
                title: "☕ 𝐍𝐎𝐓𝐈𝐅𝐈𝐂𝐀𝐂𝐈𝐎́𝐍 - 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐎",
                body: '🥳 ¡ᥙᥒ ᥙsᥙᥲrі᥆ ᥒᥙᥱ᥎᥆ ᥱᥒ mі ᑲᥲsᥱ ძᥱ ძᥲ𝗍᥆s!',
                thumbnailUrl: perfil,
                sourceUrl: redes,
                mediaType: 1,
                showAdAttribution: false,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: null });
};

handler.help = ['reg']
handler.tags = ['rg']
handler.command = ['testrg']

export default handler
