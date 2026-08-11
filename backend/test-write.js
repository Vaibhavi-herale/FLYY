const dns = require('dns').promises;
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const Chat = require('./models/Chat');

async function testWrite() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        const testChat = new Chat({
            userId: new mongoose.Types.ObjectId(),
            title: 'Test Chat',
            messages: [{ role: 'user', content: 'hello' }]
        });

        const saved = await testChat.save();
        console.log('Saved successfully:', saved._id);
        
        await Chat.findByIdAndDelete(saved._id);
        console.log('Deleted successfully');
    } catch (err) {
        console.error('Error writing to DB:', err);
    } finally {
        mongoose.connection.close();
    }
}

testWrite();
