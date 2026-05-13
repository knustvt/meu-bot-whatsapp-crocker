import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import P from 'pino'

async function startCrocker() {
    const { state, saveCreds } = await useMultiFileAuthState('crocker_auth')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket.default({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Crocker Bot', 'Chrome', '1.0']
    })

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
        
        if (body.toLowerCase() === '/menu') {
            await conn.sendMessage(from, { text: '*╭─< ✨ MENU DO CROCKER ✨ >─╮*\n*│*\n*│* 🤖 Olá! Crocker no comando!\n*│* "FAAAAAAADAS!" 🧚‍♂️🚫\n*│*\n*├─「 ⚙️ UTILIDADES 」──┤*\n*│*\n*│* 💥 */ping*\n*│* 🖼️ */sticker*\n*╰────────────────────────╯*' })
        }
        if (body.toLowerCase() === '/ping') {
            await conn.sendMessage(from, { text: '🏓 Pong! Crocker online!' })
        }
    })

    conn.ev.on('connection.update', (update) => {
        const { connection } = update
        if (connection === 'close') startCrocker()
        else if (connection === 'open') console.log('✅ CROCKER VIVO!')
    })
}
startCrocker()
