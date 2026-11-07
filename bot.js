import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Initialize WhatsApp client cleanly without hardcoded paths
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED, scan please:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('KLASH WhatsApp AI Bot is online and ready!');
});

client.on('message', async (message) => {
    if (message.isStatus) return;
    console.log(`[Incoming Message]: ${message.body}`);

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful AI assistant integrated into a WhatsApp bot." },
                { role: "user", content: message.body }
            ],
            model: "qwen-2.5-32b-instruct",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
        await message.reply(aiResponse);
        console.log(`[Reply Sent]: ${aiResponse}`);
    } catch (error) {
        console.error('Error communicating with Groq API:', error);
        await message.reply('Oops! Something went wrong while processing your request.');
    }
});

client.initialize();
