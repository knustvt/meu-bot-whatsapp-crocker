
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateWAMessageFromContent, proto, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const { removeBackground } = require('@imgly/background-removal-node');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

const startBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, is  } = await fetchLatestBaileysVersion();
    console.log(`Usando WhatsApp Web v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Bot-WhatsApp', 'Chrome', '1.0.0'],
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada devido a', lastDisconnect.error, ', reconectando:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Bot conectado!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        const text = type === 'conversation' ? msg.message.conversation : type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : '';

        const command = text.startsWith('/') ? text.split(' ')[0] : '';
        const args = text.split(' ').slice(1).join(' ');

        console.log(`Mensagem de ${from}: ${text}`);

        // Função auxiliar para download de mídia
        async function downloadMediaMessage(msg, type) {
            let mediaType;
            if (msg.message.imageMessage) {
                mediaType = msg.message.imageMessage;
            } else if (msg.message.videoMessage) {
                mediaType = msg.message.videoMessage;
            } else {
                return null; // Ou lançar um erro, dependendo do tratamento desejado
            }
            const stream = await downloadContentFromMessage(mediaType, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            return buffer;
        }

        switch (command) {
            case '/ping':
                await sock.sendMessage(from, { text: 'Pong!' });
                break;

            case '/sugestão':
                if (args) {
                    // Aqui você pode enviar a sugestão para um número específico ou logar
                    console.log(`Sugestão recebida de ${from}: ${args}`);
                    await sock.sendMessage(from, { text: 'Obrigado pela sua sugestão!' });
                } else {
                    await sock.sendMessage(from, { text: 'Por favor, forneça sua sugestão após o comando /sugestão.' });
                }
                break;

            case '/sticker':
                if (msg.message.imageMessage || msg.message.videoMessage) {
                    const media = msg.message.imageMessage || msg.message.videoMessage;
                    const stream = await downloadMediaMessage(msg, 'buffer');
                    const sticker = new Sticker(stream, {
                        pack: 'Meu Bot',
                        author: 'Manus AI',
                        type: StickerTypes.FULL,
                        quality: 100,
                    });
                    await sock.sendMessage(from, await sticker.toMessage());
                } else {
                    await sock.sendMessage(from, { text: 'Por favor, marque uma imagem, vídeo ou GIF para criar um sticker.' });
                }
                break;

            case '/semfundo':
                if (msg.message.imageMessage) {
                    const stream = await downloadMediaMessage(msg, 'buffer');
                    const result = await removeBackground(stream);
                    const sticker = new Sticker(result, {
                        pack: 'Meu Bot',
                        author: 'Manus AI',
                        type: StickerTypes.FULL,
                        quality: 100,
                    });
                    await sock.sendMessage(from, await sticker.toMessage());
                } else {
                    await sock.sendMessage(from, { text: 'Por favor, marque uma imagem para remover o fundo e criar um sticker.' });
                }
                break;

            case '/attp':
                if (args) {
                    const sticker = new Sticker(args, {
                        pack: 'Meu Bot',
                        author: 'Manus AI',
                        type: StickerTypes.TEXT,
                        quality: 100,
                    });
                    await sock.sendMessage(from, await sticker.toMessage());
                } else {
                    await sock.sendMessage(from, { text: 'Por favor, forneça o texto para criar a figurinha animada.' });
                }
                break;

            case '/hidetag':
                if (msg.key.participant && from.endsWith('@g.us')) { // Verifica se é um grupo
                    const groupMetadata = await sock.groupMetadata(from);
                    const participants = groupMetadata.participants.map(p => p.id);
                    let text = args || 'Mensagem oculta para todos os membros!';
                    await sock.sendMessage(from, { text: text, mentions: participants });
                } else {
                    await sock.sendMessage(from, { text: 'Este comando só pode ser usado em grupos.' });
                }
                break;

            case '/menugrupo':
                if (from.endsWith('@g.us')) {
                    const menuGrupo = `*╭─< ✨ MENU DE COMANDOS PARA GRUPO ✨ >─╮*\n*│*\n*│* 👑  Comandos de administração:\n*│*\n*├─「 👑 ADMINISTRAÇÃO 」──┤*\n*│*\n*│* 🗣️ */hidetag* _Menciona todos os membros do grupo de forma oculta._\n*│*\n*╰────────────────────────╯*`;
                    await sock.sendMessage(from, { text: menuGrupo });
                } else {
                    await sock.sendMessage(from, { text: 'Este comando só pode ser usado em grupos.' });
                }
                break;

            default:
                // Resposta padrão ou menu principal
                const menuPrincipal = `*╭─< ✨ MENU DE COMANDOS ✨ >─╮*\n*│*\n*│* 🤖  Aqui estão todos os comandos!\n*│* Para comandos exclusivos para grupos, use ```/menugrupo```\n*│*\n*├─「 ⚙️ UTILIDADES 」──┤*\n*│*\n*│* 💥 */ping* _Verifica a velocidade de resposta._\n*│*\n*│* 💡 */sugestão <sua sugestão>* _Envia uma sugestão para o desenvolvedor._\n*│*\n*├─「 🎨 FIGURINHAS 」──┤*\n*│*\n*│* 🖼️ */sticker* _Converte imagem, vídeo ou gif para sticker._ Uso: Marque uma mídia\n*│*\n*│* ✂️ */semfundo* _Remove o fundo de uma imagem e cria um sticker com transparência._ Uso: Marque uma imagem\n*│*\n*│* 📝 */attp <seu texto aqui>* _Cria uma figurinha de texto animado._\n*│*\n*├─「 👑 ADMINISTRAÇÃO 」──┤*\n*│*\n*│* 🗣️ */hidetag* _Menciona todos os membros do grupo de forma oculta._\n*│*\n*╰────────────────────────╯*`;
                await sock.sendMessage(from, { text: menuPrincipal });
                break;
        }
    });
};

startBot();
