const { timeStamp } = require('console');
const e = require('cors');

const app = require('express')();
const server = require('http').createServer(app);
const io = new (require('socket.io')).Server(server);
const file = (url, file=url)=>app.get(`/${url}`, (req, res)=>{res.sendFile(__dirname+`/${file}`)});
const run = {
    angle: function(x,y){
        if(x>=0 && y==0) return 0;
        return Math.atan2(-y, -x)+Math.PI;
    },
    limitAngle: function(a){
        return ((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    }

}


var vars = {
    // Universal
    exit: 60,       // Outer Border where all enitites are elliminated
    fps: 60,        // Targetted FPS
    res: 3,         // For every res^2 pixels, a pixel will represent it
    update: 1,      // Number of entity update per second
    generate: true, // Enable entity generation

    // Player - Entity 0
    player: {
        poly: [15, 0, 12, 0.8*Math.PI, 5, Math.PI, 12, 1.2*Math.PI],
        border: 20, // Inner Border where players cant exit from
        speed: 200,   // Maxium speed attainable by the user
        delay: 0.8, // Percentage on which the controls take into control
        spin: 2*Math.PI, // Maximum spin attainable by the user
    },

    // Asteriod - Entity 1
    asteriod: {
        size: [10, 20, 30],
        heath: [20, 50, 100],
        bumpy_amount: 20,
        bumpy_percentage: 0.2,
        initial_speed: 100,
        generate: [1, 1, 2], // Average number of generation per second
    },

    // Bullet - Entity 2
    bullet: {
        rate: 0.25,
        size: 10,
        speed: 400
    }
};
var servers = {};
var screen = [Math.round(1920/vars.res), Math.round(1080/vars.res)];
function Entity(para, serv){
    this.type = para.type || 0;
    this.posi = para.posi || [0, 0, 0];
    this.mome = para.mome || [0, 0, 0];
    this.leve = para.leve || 0;
    this.poly = para.poly || [];

    this.name = para.name || '';
    this.bord = para.bord || '';
    this.fill = para.fill || '';
    this.crid = para.cird || 0;
    this.span = para.span || 0;
    this.coll = para.coll || 0;
    this.cold = 0;
    this.mass = 0;
    this.serv = serv;
    this.serv.entity[this.type].push(this);
    this.upda = false;
    /*
    this.getdata = function(){
        return {
            type: this.type,
            posi: this.posi,
            poly: this.poly,
            bord: this.bord,
            fill: this.fill
        }
    };*/
    this.collide = function(that){
        // Check if both are close enough for a collision check
        var collide_distance = Math.hypot(
            that.posi[0] - this.posi[0],
            that.posi[1] - this.posi[1]
        );
        if(collide_distance > this.span+that.span) return false;

        // Get collision angle
        var collide_angle = run.angle(
            that.posi[0] - this.posi[0],
            that.posi[1] - this.posi[1]
        );

        // Interate for every point of "that"
        for(var n = 0; n < that.poly.length; n+=2){
            // Find angle and distance of point of "that" to center of "this"
            var dx = that.posi[0]+Math.cos(that.posi[2]+that.poly[n+1])*that.poly[n] - this.posi[0];
            var dy = that.posi[1]+Math.sin(that.posi[2]+that.poly[n+1])*that.poly[n] - this.posi[1];
            var theta = run.angle(dx, dy);
            var distance = Math.hypot(dx, dy);

            // Find edge of "this" that might collide to a point of "that"
            var hitpoint = [-1, -1];
            for(var k = 0; k < this.poly.length; k+=2){
                if(this.poly[k+1] > run.limitAngle(theta-this.posi[2])){
                    hitpoint[1] = k;
                    break;
                } else hitpoint[0] = k;
            }
            if(hitpoint[0] == -1) hitpoint[0] = this.poly.length-1;
            if(hitpoint[1] == -1) hitpoint[1] = 0;

            // Find the minimum distance from point of "that" to center of "this" to be considered collided
            var delta = run.limitAngle(theta-this.posi[2]);
            var hit_dx = this.poly[hitpoint[0]]*Math.cos(this.poly[hitpoint[0]+1])
                       - this.poly[hitpoint[1]]*Math.cos(this.poly[hitpoint[1]+1]);
            var hit_dy = this.poly[hitpoint[0]]*Math.sin(this.poly[hitpoint[0]+1])
                       - this.poly[hitpoint[1]]*Math.sin(this.poly[hitpoint[1]+1]);
            var minimum = (
                hit_dx*this.poly[hitpoint[0]]*Math.sin(this.poly[hitpoint[0]+1]) -
                hit_dy*this.poly[hitpoint[0]]*Math.cos(this.poly[hitpoint[0]+1])
            )/(
                hit_dx*Math.sin(delta) -
                hit_dy*Math.cos(delta)
            );
            if(distance > minimum) continue;

            // Calculate collision force (F=m*a)
            var collision = Math.hypot(this.mome[0], this.mome[1])
                            * Math.cos(Math.abs(collide_angle-run.angle(this.mome[0], this.mome[1])))
                          - Math.hypot(that.mome[0], that.mome[1])
                            * Math.cos(Math.abs(collide_angle-run.angle(that.mome[0], that.mome[1])));
            if(collision <= 0) return false;
            
            // Do damage
            this.health -= 0.1*collision;
            that.health -= 0.1*collision;
            this.coll    = collide_angle;
            that.coll    = collide_angle+Math.PI;

            // Calculate ratio of mass
            var mass_ratio = this.mass/that.mass;

            // Pass Momentum
            this.mome[0] -= collision*Math.cos(collide_angle)*Math.cos(theta-collide_angle)/mass_ratio;
            this.mome[1] -= collision*Math.sin(collide_angle)*Math.cos(theta-collide_angle)/mass_ratio;
            this.mome[2] += collide_angle-theta;
            that.mome[0] += collision*Math.cos(collide_angle)*mass_ratio;
            that.mome[1] += collision*Math.sin(collide_angle)*mass_ratio;
            that.mome[2] -= collide_angle-theta;

            // End
            return true;
        }
    }

    // Generate Player
    if(this.type == 0){
        this.poly = vars.player.poly;
        var i = 0;
        while(i <= this.serv.colors.length){
            if(this.serv.colors[i] == undefined){
                this.serv.colors[i] = true;
                break;
            }
            i++;
        }
        this.crid = i;
        this.fill = `hsl(${
            360*(2*i+1-Math.pow(2,1+Math.floor(Math.log2(i))))/Math.pow(2, Math.ceil(Math.log2(i+1)))
        },100%,50%)`;
        this.bord = '#FFF';
        if(!('posi' in para)) this.posi = [
            Math.random()*(this.serv.space[0]-vars.player.border*2)+vars.player.border,
            Math.random()*(this.serv.space[1]-vars.player.border*2)+vars.player.border,
            Math.random()*2*Math.PI
        ];
        this.health = 100;
        this.span = 15;
        this.mass = 50;
    
    // Generate Asteriod
    } else if(this.type == 1){
        this.poly = [];
        for(var i = 0; i < vars.asteriod.bumpy_amount; i++){
            var h = vars.asteriod.size[this.leve]*(1-vars.asteriod.bumpy_percentage)+Math.random()*vars.asteriod.size[this.leve]*vars.asteriod.bumpy_percentage;
            if(h > this.span) this.span = h;
            this.poly.push(h, 2*Math.PI*i/vars.asteriod.bumpy_amount);
        }
        var dir = Math.floor(Math.random()*4);
        var spe = [
            Math.random()*vars.asteriod.initial_speed,
            (Math.random()*2-1)*vars.asteriod.initial_speed
        ];
        if(!('posi' in para)) this.posi = [
            dir>1? Math.random()*this.serv.space[0] : (dir==0 ? -vars.exit : this.serv.space[0]+vars.exit),
            dir>1? (dir==2 ? -vars.exit : this.serv.space[1]+vars.exit) : Math.random()*this.serv.space[1],
            Math.random()*2*Math.PI
        ];
        if(!('mome' in para)) this.mome = [
            (dir==1?-1:1)*spe[dir>1?1:0],
            (dir==3?-1:1)*spe[dir>1?0:1],
            (Math.random()*2-1)*Math.PI
        ];
        this.health = vars.asteriod.heath[this.leve];
        this.fill = '#222';
        this.bord = '#aaa';
        this.mass = vars.asteriod.size[this.leve]
        //console.log(`ASTERIOD: ${this.posi}, ${this.mome}`);
    // Generate Bullet
    } else if(this.type == 2){
        //this.poly = []
        this.health = 1;
        this.span = vars.bullet.size/2;
        this.mass = 0.001;
    }
    io.to(this.serv.name).emit('created', [this.type, {posi:this.posi,mome:this.mome,poly:this.poly,bord:this.bord,fill:this.fill}]);
}
function Server(name){
    this.entity = [
        [], // Players
        [], // Asteriod
        [], // Bullets
    ];
    this.delete = function(i, j){
        if(i == 0){
            this.colors[this.entity[i][j].crid] = undefined;
        }
        delete this.players[this.entity[i][j].name];
        delete this.entity[i][j];
        this.entity[i].splice(j, 1);
        io.to(this.name).emit('deleted', [i, j]);
    }
    this.colors = [];
    this.space = screen;
    this.players = {};
    this.name = name;
    this.time = new Date();
    /*
    this.generatejson = function(){
        var entity = [];
        for(var i = 0; i < this.entity.length; i++){
            entity.push([]);
            for(var j = 0; j < this.entity[i].length; i++){
                //if(entity[i].push(this.entity[i][j].generatejson())) io.to(self.name).emit('collide', [i,j,i2,j2,]);
            }
        }
        var res = '{entity:[';
        for(var i = 0; i < entity.length; i++){
            res += `[${entity[i].join()}]`;
            if(i+1 != entity.length) res += ',';
        }
        return res;
    };*/
    this.run = function(self){
        var tmp_time = new Date();
        var delta = (tmp_time-self.time)/1000;
        self.time = tmp_time;
        delete tmp_time;
        for(var i = 0; i < self.entity.length; i++){
            for(var j = 0; j < self.entity[i].length; j++){
                var e = self.entity[i][j];
                // Collisions
                for(var i2 = 0; i2 < self.entity.length; i2++){
                    for(var j2 = 0; j2 < self.entity[i2].length; j2++){
                        if(i != i2 || j != j2){
                            if(e.collide(self.entity[i2][j2])){
                                e.upda = true;
                                self.entity[i2][j2].upda = true;
                            }
                        }
                    }
                }
                // Physics update
                e.posi[0] += e.mome[0]*delta;
                e.posi[1] += e.mome[1]*delta;
                e.posi[2] = run.limitAngle(e.posi[2]+e.mome[2]*delta);
                
                // Elliminate entities past exit zone
                if(e.posi[0] <              -vars.exit ||
                   e.posi[0] > self.space[0]+vars.exit ||
                   e.posi[1] <              -vars.exit ||
                   e.posi[1] > self.space[1]+vars.exit )
                    return self.delete(i, j);
                
                // Player border
                if(i == 0){
                    if(e.posi[0] < vars.player.border) e.posi[0] = vars.player.border;
                    if(e.posi[1] < vars.player.border) e.posi[1] = vars.player.border;
                    if(e.posi[0] > self.space[0]-vars.player.border) e.posi[0] = self.space[0]-vars.player.border;
                    if(e.posi[1] > self.space[1]-vars.player.border) e.posi[1] = self.space[1]-vars.player.border;
                }

                // Below health
                if(e.health <= 0){
                    // Player Death
                    if(i == 0){
                        self.delete(i, j);
                        continue;
                    }
                    // Asteriod Breaking
                    if(i == 1){
                        if(e.leve == 0){
                            self.delete(i, j);
                            continue;
                        }
                        //e.leve--;
                        var h = Math.hypot(e.mome[0], e.mome[1]);
                        var g = run.angle(e.mome[0], e.mome[1]);
                        var a = new Entity({type: 1, leve: e.leve-1, posi: [
                            e.posi[0]+Math.cos(e.coll+0.5*Math.PI)*vars.asteriod.size[e.leve]*0.8,
                            e.posi[1]+Math.sin(e.coll+0.5*Math.PI)*vars.asteriod.size[e.leve]*0.8,
                            e.posi[2]
                        ], mome: [
                            h*Math.cos(g-0.2),
                            h*Math.sin(g-0.2),
                            e.mome[2]
                        ]}, self);
                        var b = new Entity({type: 1, leve: e.leve-1, posi: [
                            e.posi[0]+Math.cos(e.coll-0.5*Math.PI)*vars.asteriod.size[e.leve]*0.8,
                            e.posi[1]+Math.sin(e.coll-0.5*Math.PI)*vars.asteriod.size[e.leve]*0.8,
                            e.posi[2]
                        ], mome: [
                            h*Math.cos(g+0.2),
                            h*Math.sin(g+0.2),
                            e.mome[2]
                        ], bord: e.fill}, self);
                        //a.posi[0] += 100;//Math.cos(e.coll+0.5*Math.PI)*vars.asteriod.size[e.leve]*50;
                        //a.posi[1] += 100;//Math.sin(e.coll+0.5*Math.PI)*vars.asteriod.size[e.leve]*50;
                        //a.mome[0] -= Math.cos(e.coll-0.5*Math.PI)*2;
                        //a.mome[1] -= Math.sin(e.coll-0.5*Math.PI)*2;

                        //b.posi[0] += -100;//Math.cos(e.coll-0.5*Math.PI)*vars.asteriod.size[e.leve]*50;
                        //b.posi[1] += -100;//Math.sin(e.coll-0.5*Math.PI)*vars.asteriod.size[e.leve]*50;
                        //b.mome[0] -= Math.cos(e.coll+0.5*Math.PI)*2;
                        //b.mome[1] -= Math.sin(e.coll+0.5*Math.PI)*2;
                        self.delete(i, j);
                        continue;
                    }
                    // Bullet deletion
                    if(e.type == 2){
                        self.delete(i, j);
                        continue;
                    }
                }
                
                // Spawn bullet
                if(e.type == 0){
                    e.cold += delta;
                    //var prob = vars.bullet.rate*delta;
                    if(e.cold>vars.bullet.rate){
                        var b = new Entity({type: 2, poly: [
                            vars.bullet.size/2,
                            0,
                            vars.bullet.size/2,
                            Math.PI
                        ], posi: [
                            e.posi[0]+(e.span+1+vars.bullet.size/2)*Math.cos(e.posi[2]),
                            e.posi[1]+(e.span+1+vars.bullet.size/2)*Math.sin(e.posi[2]),
                            e.posi[2],
                        ], mome: [
                            vars.bullet.speed*Math.cos(e.posi[2]),
                            vars.bullet.speed*Math.sin(e.posi[2]),
                            0
                        ]}, self);
                        e.cold -= vars.bullet.rate;
                    } 
                }
                if(e.upda){
                    io.to(self.name).emit('update', [i,j,e.posi,e.mome]);
                    e.upda = false;
                }
                //res.entity[i].push(e.getdata());
            }
        }
        // Generate random asteriods
        if(vars.generate){
            for(var i = 0; i < vars.asteriod.generate.length; i++){
                var prob = vars.asteriod.generate[i]*delta;
                for(var j = 0; j < Math.floor(prob); j++) var ast = new Entity({type:1,leve:i}, self);
                if(Math.random()<prob%1) var ast = new Entity({type:1,leve:i}, self);
            }
        }
        // Update
        //io.to(self.name).emit('update', res);
    };
    this.interval = setInterval(this.run, 1000/vars.fps, this);
    console.log('New server at '+this.name);
}

file('screen', 'screen.html');
file('library.js');
file('script.js');
file('retro_arcade.ttf');
file('', 'controller.html');

app.get('/name_available', (req, res)=>{ // req.params -> room, name
    // If room exist, then if type is player/controller, then if name is taken
    res.send(req.query.room in servers && req.query.name in servers[req.query.room].players ? 'false' : 'true');
});
app.get('/current', (req, res)=>{
    if(!('room' in req.query) || !(req.query.room in servers)){
        res.send('{"entity":[]}');
        return;
    }
    var room = req.query.room;
    var dat = {entity:[]};
    for(var i = 0; i < servers[room].entity.length; i++){
        dat.entity.push([]);
        for(var j = 0; j < servers[room].entity[i].length; j++){
            var e = servers[room].entity[i][j];
            dat.entity[i].push({
                posi: e.posi,
                mome: e.mome,
                poly: e.poly,
                bord: e.bord,
                fill: e.fill
            });
        }
    }
    res.send(JSON.stringify(dat));
});

io.on('connection', socket=>{
    var line = {};
    socket.on('join', para=>{
        socket.join(para.room);
        if(!(para.room in servers)) servers[para.room] = new Server(para.room);
        if(para.type == 0) servers[para.room].players[para.name] = new Entity({type: 0, name: para.name}, servers[para.room]);
        line.room = para.room;
        line.name = para.name;
        line.type = para.type;
        //io.emit('new-entity', '{type:0}');
        console.log(para.type == 0 ? `Player "${para.name}" joined at ${para.room}` : `Screen for ${para.room} connected`);
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

// Automaticall Start server "main"
servers['main'] = new Server('main');