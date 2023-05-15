const app = require('express')();
const server = require('http').createServer(app);
const io = new (require('socket.io')).Server(server);
const engine = require('./engine.js');
const file = (url, file=url)=>app.get(`/${url}`, (req, res)=>{res.sendFile(__dirname+`/${file}`)});

var servers = {};

// Handling HTTP Requests
file('screen', 'screen.html');
file('server', 'server.html');
file('', 'controller.html');

file('engine.js');
file('retro_arcade.ttf');

app.get('/name_available', (req, res)=>{ // req.params -> room, name
    if(req.query.room in servers && servers[req.query.room] === true){
        var get_response = new Promise(resolve=>{
            io.to(room).emit('name-available', data=>{
                console.log(`response(bef): ${data}`);
                resolve(data);
            });
        })
    }
    // If room exist, then if type is player/controller, then if name is taken
    res.send(req.query.room in servers && req.query.name in servers[req.query.room].players ? 'false' : 'true');
});
app.get('/current', async (req, res)=>{
    if(!('room' in req.query) || !(req.query.room in servers)){
        res.send(`{"entity":[],"date":${Number(new Date())}}`);
        return;
    }
    var room = req.query.room;
    if(servers[room] === true){
        /*console.log('requesting');
        var get_response = new Promise(resolve=>{
            io.to(room).emit('current-request', data=>{
                console.log(`response(bef): ${data}`);
                resolve(data);
            });
        })
        var resp = await get_response;
        console.log(`response: ${resp}`);
        res.send(resp);*/
    } else res.send(servers[room].current());
});

io.on('connection', socket=>{
    var line = {};
    socket.on('join', para=>{
        socket.join(para.room);
        if(!(para.room in servers)){
            if(para.type != 2) servers[para.room] = new engine.server(para.room, io);
            else servers[para.room] = true;
        }
        if(para.type == 0){
            if(servers[para.room] === true) io.to(para.room).emit('player-joined', para.name);
            else servers[para.room].players[para.name] = new engine.entity({type: 0, name: para.name}, servers[para.room]);
        }
        line.room = para.room;
        line.name = para.name;
        line.type = para.type;
        console.log(para.type == 0 ? `Player "${para.name}" joined at ${para.room}` :
                    para.type == 1 ? `Screen for ${para.room} connected` :
                    para.type == 2 ? `Server for ${para.room} connected` :
                    'Undefined type connected');
    });
    socket.on('moving', vec=>{
        if(line.type != 0) return;
        var e = servers[line.room].players[line.name];
        e.mome[0] = vars.player.delay    *e.mome[0]
                  + (1-vars.player.delay)*vars.player.speed*vec[0];
        e.mome[1] = vars.player.delay    *e.mome[1]
                  + (1-vars.player.delay)*vars.player.speed*vec[1];
        e.upda = true;
    });
    socket.on('shooting', vec=>{
        if(line.type != 0) return;
        var e = servers[line.room].players[line.name];
        var theta = run.angle(vec[0], vec[1]);
        var delta = theta-e.posi[2];
        if(delta >  Math.PI) delta -= 2*Math.PI;
        if(delta < -Math.PI) delta += 2*Math.PI;
        e.mome[2] = vars.player.delay    *e.mome[2]
                  + (1-vars.player.delay)*delta*5;
        if(e.mome[2] < -vars.player.spin) e.mome[2] = -vars.player.spin;
        if(e.mome[2] >  vars.player.spin) e.mome[2] =  vars.player.spin;
        e.upda = true;
    })
    socket.on('disconnect', ()=>{
        if(line.type == 0){
            for(var i = 0; i < servers[line.room].entity[0].length; i++){
                if(servers[line.room].entity[0][i].name == line.name){
                    delete servers[line.room].colors[servers[line.room].entity[0][i].crid];
                    delete servers[line.room].players[line.name];
                    servers[line.room].delete(0, i);
                }
            }
            console.log(`Player ${line.name} disconnected at ${line.room}`);
        } else {
            console.log(`Screen for ${line.room} disconnected`);
        }
        delete line;
    });
});
server.listen(80, ()=>{
    console.log('Hosting on *:80');
});

// Automatically Start server "main"
servers['main'] = new engine.server('main', io);