import http from 'http';

const server = http.createServer((req, res) => {
    console.log('Received request!');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

server.listen(5001, '0.0.0.0', () => {
    console.log('Test server running on port 5001');
});
