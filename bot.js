import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan this QR code with your WhatsApp to link your AI bot!');
});

client.on('ready', () => {
    console.log('KLASH AI WhatsApp Companion is online and ready!');
});

client.on('message', async msg => {
    if (msg.fromMe || msg.isStatus) return;

    console.log(`Received message: ${msg.body}`);

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "qwen/qwen2.5-32b-instruct",
                messages: [
                    {
                        role: "system",
                        content: "You are KLASH AI, a smart, direct, and creative personal assistant built by KLASH WORLD."
                    },
                    {
                        role: "user",
                        content: msg.body
                    }
                ]
            })
        });

        const data = await response.json();
        const aiReply = data.choices?.[0]?.message?.content || "I couldn't process that response.";

        await msg.reply(aiReply);

    } catch (error) {
        console.error("API Error:", error);
        await msg.reply("System error connecting to KLASH AI backend.");
    }
});

client.initialize();
