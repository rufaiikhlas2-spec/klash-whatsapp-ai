import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import Groq from 'groq-sdk';
import pino from 'pino';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Your configured WhatsApp phone number
const pairingNumber = "2348062112118"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    // Automatically request a pairing code since the number is provided
    if (!sock.authState.creds.registered && pairingNumber) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(pairingNumber);
                console.log(`\n========================================`);
                console.log(`YOUR WHATSAPP PAIRING CODE IS: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error('Failed to request pairing code:', err);
            }
        }, 4000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        if (qr) {
            console.log('QR RECEIVED, scan please:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('KLASH WhatsApp AI Bot is online and ready!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const messageBody = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!messageBody) return;
        console.log(`[Incoming Message]: ${messageBody}`);

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a helpful AI assistant integrated into a WhatsApp bot." },
                    { role: "user", content: messageBody }
                ],
                model: "qwen-2.5-32b-instruct",
                temperature: 0.7,
                max_tokens: 1024,
            });

            const aiResponse = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
            await sock.sendMessage(sender, { text: aiResponse });
            console.log(`[Reply Sent]: ${aiResponse}`);
        } catch (error) {
            console.error('Error communicating with Groq API:', error);
            await sock.sendMessage(sender, { text: 'Oops! Something went wrong while processing your request.' });
        }
    });
}

startBot();
