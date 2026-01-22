// Test WebSocket connection
const io = require('socket.io-client');

const socket = io('http://localhost:3003');

socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully');
    socket.emit('join-dashboard');
});

socket.on('metrics-update', (data) => {
    console.log('📊 Received metrics update:', data);
});

socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
});

setTimeout(() => {
    socket.disconnect();
    process.exit(0);
}, 3000);
