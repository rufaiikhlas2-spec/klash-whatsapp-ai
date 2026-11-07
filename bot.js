import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import Groq from 'groq-sdk';

// Initialize Groq client using the environment variable
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Initialize WhatsApp client with Puppeteer settings for Render
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Generate QR code for scanning in the terminal/logs
client.on('qr', (qr) => {
    console.log('QR RECEIVED, scan please:');
    qrcode.generate(qr, { small: true });
});

// Notify when the bot is successfully connected and ready
client.on('ready', () => {
    console.log('KLASH WhatsApp AI Bot is online and ready!');
});

// Handle incoming messages
client.on('message', async (message) => {
    // Ignore messages from status broadcasts or groups if you only want direct chats
    if (message.isStatus) return;

    console.log(`[Incoming Message from ${message.from}]: ${message.body}`);

    try {
        // Send message to Groq API (using Qwen 2.5 32B model)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI assistant integrated into a WhatsApp bot."
                },
                {
                    role: "user",
                    content: message.body
                }
            ],
            model: "qwen-2.5-32b-instruct",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

        // Reply back to the WhatsApp chat
        await message.reply(aiResponse);
        console.log(`[Reply Sent]: ${aiResponse}`);

    } catch (error) {
        console.error('Error communicating with Groq API:', error);
        await message.reply('Oops! Something went wrong while processing your request.');
    }
});

// Start the client
client.initialize();
