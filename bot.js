import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import P from 'pino'
import http from 'http' // Para a Render não desligar o bot

async function startCrocker() {
    // Cria um servidor básico para a Render (obrigatório para plano grátis)
    http.createServer((req, res) => { res.write('Crocker Online!'); res.end(); }).listen(process.env.PORT || 3000)

    const { state, saveCreds } = await useMultiFileAuthState('crocker_auth')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket.default({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false, // Desliga o QR
        auth: state,
        browser: ['Crocker Bot', 'Chrome', '1.0']
    })

    // --- SOLICITAR CÓDIGO DE PAREAMENTO AUTOMATICAMENTE ---
    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            let code = await conn.requestPairingCode("5491168285717") // Seu número
            console.log(`\n\nCÓDIGO DE PAREAMENTO: ${code}\n\n`)
        }, 5000)
    }

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
        
        if (body.toLowerCase() === '/menu') {
            await conn.sendMessage(from, { text: '*╭─< ✨ MENU DO CROCKER ✨ >─╮*\n*│*\n*│* 🤖 Olá! Crocker no comando!\n*│* "FAAAAAAADAS!" 🧚‍♂️🚫\n*│*\n*├─「 ⚙️ UTILIDADES 」──┤*\n*│*\n*│* 💥 */ping*\n*╰────────────────────────╯*' })
        }
    })

    conn.ev.on('connection.update', (update) => {
        const { connection } = update
        if (connection === 'close') startCrocker()
        else if (connection === 'open') console.log('✅ CROCKER VIVO E 24H ONLINE!')
    })
}
startCrocker()
