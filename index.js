const app = require('express')();
const server = require('http').createServer(app);
const io = new (require('socket.io')).Server(server);
const engine = require('./engine.js');
const galactic_strike = require('./galactic_strike.js');
const file = (url, file=url)=>app.get(`/${url}`, (req, res)=>{res.sendFile(__dirname+`/${file}`)});

// https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const ipadd = Object.create(null);
for (const name of Object.keys(nets)){
    for (const net of nets[name]) {
        const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
        if (net.family === familyV4Value && !net.internal) {
            if (!ipadd[name]) {
                ipadd[name] = [];
            }
            ipadd[name].push(net.address);
        }
    }
}

var servers = {};
function CreateServer(room){
    servers[room] = new engine(galactic_strike);
    var s = servers[room];
    s.on('event', e=>io.to(room).emit('event', e));
    s.start();
    console.log('  - Created server at room "'+room+'"');
    return s;
}

file('engine.js', 'engine.js');
file('galactic_strike.js', 'galactic_strike.js');
app.get('/', (req,res)=>res.sendFile(__dirname+`/control/index.html`));
app.get('/sfx/*', (req,res)=>res.sendFile(__dirname+`/${req.url}`));
app.get('/int/*', (req,res)=>res.sendFile(__dirname+`/interface/${req.url.substring(4).split('?')[0]}`));
app.get('/*', (req,res)=>res.sendFile(__dirname+`/control/${req.url}`));

io.on('connection', sock=>{
    var line = {};
    sock.on('join_req', para=>{
        line['id'] = para['id'];
        /* ----- HOSTING ----- */
        if(para['host'] != undefined){
            // Join hosting room
            line['host'] = para['host'];
            sock.join(line['host']);
            if(line['host'] in servers) sock.emit('join_res', {id:line.id, error: 'Room already has server, denied hosting'});
            else {
                servers[line['host']] = line;
                sock.emit('join_res', {id:line.id});
                sock.on('event', data=>sock.to(line.host).emit('event', data));
                sock.on('join_res', data=>sock.to(line.host).emit('join_res', data));
                sock.on('play_res', data=>sock.to(line.host).emit('play_res', data));
                console.log('  - Hoster connected to "'+line.host+'"');
                servers[line['host']] = {
                    host: true
                };
                sock.on('disconnect', ()=>delete servers[line['host']]);
            }
            

        /* ----- CLIENT ----- */
        } else if(para['room'] != undefined){
            // Joing client room
            line['room'] = para['room'];
            sock.join(line['room']);
            // Create server if it does not exist
            if(servers[line['room']] == undefined) var s = CreateServer(line['room']);
            else s = servers[line['room']];
            // Successfully joined
            if(s.host == true){
                console.log('  + host requested')
                io.to(line.room).emit('join_req', {id:line.id});
            } else sock.emit('join_res', {id:line.id, config:s.config, entity:s.entity});
            console.log('  - Client connected to "'+line.room+'"');

        /* ----- NO PARAMETERS GIVEN ----- */
        } else sock.emit('join_status', {id:line.id, error: 'No parameters given, ignoring request'});
    });
    sock.on('play_req', para=>{
        if(!(para.room in servers)) return sock.emit('play_res', {id:para.id, error: 'Room does not exist'});
        line.room = para.room;
        sock.join(line.room);
        var s = servers[para.room];
        if(s.host == true){
            console.log('  + controller requested')
            io.to(line.room).emit('play_req', para);
        } else sock.emit('play_res', para);
        sock.on('play_vel', data=>io.to(line.room).emit('play_vel', data));
        sock.on('disconnect', ()=>io.to(line.room).emit('play_end', {id:para.id}));
        console.log('  - Controller connected to "'+line.room+'"');
    });
});

server.listen(80, ()=>{
    console.log('Hosting "Galactic Stike" on');
    console.log(`  - Localhost: 127.0.0.1`);
    for(const net of Object.keys(ipadd)){
        console.log(`  - ${net}: ${ipadd[net]}`);
    }
    console.log('Logs:')
});