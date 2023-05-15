// config   - Responsible for storing and controling the game configurations
var config = {
    // Universal
    exit: 60,       // Outer Border where all enitites are elliminated
    fps: 60,        // Targetted FPS
    update: 1,      // Number of entity update per second
    generate: true, // Enable entity generation
    entities: 3,    // Number of entities
    space:[640,360],// Size of playground/space

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

// simply   - Responsible for simplifying code through modularization
const simply = {
    // Calculate and return
    angle: function(x,y){
        if(x>=0 && y==0) return 0;
        return Math.atan2(-y, -x)+Math.PI;
    },
    limitAngle: function(a){
        return ((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    },
    id: function(id){
        return document.getElementById(id);
    },
    istouch: function(){
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    },
    // Functions & Features
    http: function(data){
        var h = new XMLHttpRequest();
        h.onreadystatechange = () => {
            if(h.readyState == 4){
                if(h.status == 200) data.get((data.enc != undefined && data.enc == 'json' ? JSON.parse(h.responseText) : h.responseText));
                else if(data.err != undefined) data.err(h.status);
            }
        };
        h.open('GET', data.url+(data.arg==undefined?'':'?'+new URLSearchParams(data.arg).toString()), true);
        h.send();
    },
    fullscreen: function(){
        if(document.body.requestFullscreen) document.body.requestFullscreen();
        else if(document.body.webkitRequestFullscreen) document.body.webkitRequestFullscreen();
        else if(document.body.msRequestFullscreen) document.body.msRequestFullscreen();
    },
    joystick: function(dom){
        this.dat = {active:false, vector:[0,0]};
        this.dom = dom;
        this.drag = e => {
            var x = 2*(e.targetTouches[0].clientX-this.dom.getBoundingClientRect().x)/this.dom.getBoundingClientRect().width-1;
            var y = 2*(e.targetTouches[0].clientY-this.dom.getBoundingClientRect().y)/this.dom.getBoundingClientRect().height-1;
            if(x<-1) x=-1;
            if(x>1) x=1;
            if(y<-1) y=-1;
            if(y>1) y=1;
            var h = Math.hypot(x,y);
            if(h>1){
                x /= h;
                y /= h;
            }
            this.dom.children[0].style.left = 50*x+40 + '%';
            this.dom.children[0].style.top = 50*y+40 + '%';
            if(window.innerHeight > window.innerWidth) [x,y] = [y,-x];
            this.dat.vector = [x,y];
            e.preventDefault();
        }
        this.dom.ontouchstart = e => {
            this.dat.active = true;
            this.drag(e);
        };
        this.dom.ontouchmove = this.drag;
        this.dom.ontouchend = e => {
            this.dom.children[0].style.left = '40%';
            this.dom.children[0].style.top = '40%';
            this.dat.active = false;
        }
    }
}

// entity   - Responsible for managing a entity and its behaviors
function entity(para, serv){
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
    this.upda = false;
    
    serv.entity[this.type].push(this);
    this.collide = function(that){
        // Check if both are close enough for a collision check
        var collide_distance = Math.hypot(
            that.posi[0] - this.posi[0],
            that.posi[1] - this.posi[1]
        );
        if(collide_distance > this.span+that.span) return {collide:false};

        // Get collision angle
        var collide_angle = simply.angle(
            that.posi[0] - this.posi[0],
            that.posi[1] - this.posi[1]
        );

        // Interate for every point of "that"
        for(var n = 0; n < that.poly.length; n+=2){
            // Find angle and distance of point of "that" to center of "this"
            var dx = that.posi[0]+Math.cos(that.posi[2]+that.poly[n+1])*that.poly[n] - this.posi[0];
            var dy = that.posi[1]+Math.sin(that.posi[2]+that.poly[n+1])*that.poly[n] - this.posi[1];
            var theta = simply.angle(dx, dy);
            var distance = Math.hypot(dx, dy);

            // Find edge of "this" that might collide to a point of "that"
            var hitpoint = [-1, -1];
            for(var k = 0; k < this.poly.length; k+=2){
                if(this.poly[k+1] > simply.limitAngle(theta-this.posi[2])){
                    hitpoint[1] = k;
                    break;
                } else hitpoint[0] = k;
            }
            if(hitpoint[0] == -1) hitpoint[0] = this.poly.length-1;
            if(hitpoint[1] == -1) hitpoint[1] = 0;

            // Find the minimum distance from point of "that" to center of "this" to be considered collided
            var delta = simply.limitAngle(theta-this.posi[2]);
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
                            * Math.cos(Math.abs(collide_angle-simply.angle(this.mome[0], this.mome[1])))
                          - Math.hypot(that.mome[0], that.mome[1])
                            * Math.cos(Math.abs(collide_angle-simply.angle(that.mome[0], that.mome[1])));
            if(collision <= 0) return {collide:false};
            
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
            return {collide:true, posi: [
                that.posi[0]+Math.cos(that.posi[2]+that.poly[n+1])*that.poly[n],
                that.posi[1]+Math.sin(that.posi[2]+that.poly[n+1])*that.poly[n],
                collide_angle
            ], collision: collision, mome: [
                this.mome[0]+that.mome[0],
                this.mome[1]+that.mome[1],
                0
            ]};
        }
        return {collide:false};
    }

    // Generate Player
    if(this.type == 0){
        this.poly = config.player.poly;
        var i = 0;
        while(i <= serv.colors.length){
            if(serv.colors[i] == undefined){
                serv.colors[i] = this.name;
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
            Math.random()*(serv.space[0]-config.player.border*2)+config.player.border,
            Math.random()*(serv.space[1]-config.player.border*2)+config.player.border,
            Math.random()*2*Math.PI
        ];
        this.health = 100;
        this.span = 15;
        this.mass = 50;
    
    // Generate Asteriod
    } else if(this.type == 1){
        this.poly = [];
        for(var i = 0; i < config.asteriod.bumpy_amount; i++){
            var h = config.asteriod.size[this.leve]*(1-config.asteriod.bumpy_percentage)+Math.random()*config.asteriod.size[this.leve]*config.asteriod.bumpy_percentage;
            if(h > this.span) this.span = h;
            this.poly.push(h, 2*Math.PI*i/config.asteriod.bumpy_amount);
        }
        var dir = Math.floor(Math.random()*4);
        var spe = [
            Math.random()*config.asteriod.initial_speed,
            (Math.random()*2-1)*config.asteriod.initial_speed
        ];
        if(!('posi' in para)) this.posi = [
            dir>1? Math.random()*serv.space[0] : (dir==0 ? -config.exit : serv.space[0]+config.exit),
            dir>1? (dir==2 ? -config.exit : serv.space[1]+config.exit) : Math.random()*serv.space[1],
            Math.random()*2*Math.PI
        ];
        if(!('mome' in para)) this.mome = [
            (dir==1?-1:1)*spe[dir>1?1:0],
            (dir==3?-1:1)*spe[dir>1?0:1],
            (Math.random()*2-1)*Math.PI
        ];
        this.health = config.asteriod.heath[this.leve];
        this.fill = '#222';
        this.bord = '#aaa';
        this.mass = config.asteriod.size[this.leve]
    } else if(this.type == 2){
        this.health = 1;
        this.span = config.bullet.size/2;
        this.mass = 0.001;
    }
    serv.send('created', [this.type, {posi:this.posi,mome:this.mome,poly:this.poly,bord:this.bord,fill:this.fill}]);
}

// server   - Responsible for managing a specific group of entities and their behaviors
function server(name, socket=undefined){
    this.entity = [
        [], // Players
        [], // Asteriod
        [], // Bullets
    ];
    this.socket = socket;
    this.send_passthrough = function(){};
    this.send = function(name, data){
        //console.log(`SEND ${name}:${data}`);
        if(this.socket != undefined) this.socket.to(this.name).emit(name, data);
        else this.send_passthrough(name, data);
    };
    this.delete = function(i, j){
        if(i == 0){
            this.colors[this.entity[i][j].crid] = undefined;
        }
        delete this.players[this.entity[i][j].name];
        delete this.entity[i][j];
        this.entity[i].splice(j, 1);
        this.send('deleted', [i, j]);
    }
    this.colors = [];
    this.space = config.space;
    this.players = {};
    this.name = name;
    this.time = new Date();
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
                            var act = e.collide(self.entity[i2][j2]);
                            if(act.collide){
                                e.upda = true;
                                self.entity[i2][j2].upda = true;
                                self.send('particle', [1, act.posi, act.collision/4, act.mome]);
                            }
                        }
                    }
                }
                // Physics update
                e.posi[0] += e.mome[0]*delta;
                e.posi[1] += e.mome[1]*delta;
                e.posi[2] = simply.limitAngle(e.posi[2]+e.mome[2]*delta);
                
                // Elliminate entities past exit zone
                if(e.posi[0] <              -config.exit ||
                   e.posi[0] > self.space[0]+config.exit ||
                   e.posi[1] <              -config.exit ||
                   e.posi[1] > self.space[1]+config.exit )
                    return self.delete(i, j);
                
                // Player border
                if(i == 0){
                    if(e.posi[0] < config.player.border){ e.posi[0] = config.player.border; e.mome[0] = 0 }
                    if(e.posi[1] < config.player.border){ e.posi[1] = config.player.border; e.mome[1] = 0 }
                    if(e.posi[0] > self.space[0]-config.player.border){ e.posi[0] = self.space[0]-config.player.border; e.mome[0] = 0 }
                    if(e.posi[1] > self.space[1]-config.player.border){ e.posi[1] = self.space[1]-config.player.border; e.mome[1] = 0 }
                }

                // Below health
                if(e.health <= 0){
                    // Player Death
                    if(i == 0){
                        //self.delete(i, j);
                        //continue;
                    }
                    // Asteriod Breaking
                    if(i == 1){
                        if(e.leve == 0){
                            self.delete(i, j);
                            self.send('particle', [0, e.posi, config.asteriod.size[0]*5]);
                            continue;
                        }
                        //e.leve--;
                        var h = Math.hypot(e.mome[0], e.mome[1]);
                        var g = simply.angle(e.mome[0], e.mome[1]);
                        var a = new entity({type: 1, leve: e.leve-1, posi: [
                            e.posi[0]+Math.cos(e.coll+0.5*Math.PI)*config.asteriod.size[e.leve]*0.8,
                            e.posi[1]+Math.sin(e.coll+0.5*Math.PI)*config.asteriod.size[e.leve]*0.8,
                            e.posi[2]
                        ], mome: [
                            h*Math.cos(g-0.2),
                            h*Math.sin(g-0.2),
                            e.mome[2]
                        ]}, self);
                        var b = new entity({type: 1, leve: e.leve-1, posi: [
                            e.posi[0]+Math.cos(e.coll-0.5*Math.PI)*config.asteriod.size[e.leve]*0.8,
                            e.posi[1]+Math.sin(e.coll-0.5*Math.PI)*config.asteriod.size[e.leve]*0.8,
                            e.posi[2]
                        ], mome: [
                            h*Math.cos(g+0.2),
                            h*Math.sin(g+0.2),
                            e.mome[2]
                        ], bord: e.fill}, self);
                        self.send('particle', [0, e.posi, config.asteriod.size[e.leve]*5]);
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
                    //var prob = config.bullet.rate*delta;
                    if(e.cold>config.bullet.rate){
                        var b = new entity({type: 2, poly: [
                            config.bullet.size/2,
                            0,
                            config.bullet.size/2,
                            Math.PI
                        ], posi: [
                            e.posi[0]+(e.span+1+config.bullet.size/2)*Math.cos(e.posi[2]),
                            e.posi[1]+(e.span+1+config.bullet.size/2)*Math.sin(e.posi[2]),
                            e.posi[2],
                        ], mome: [
                            config.bullet.speed*Math.cos(e.posi[2]),
                            config.bullet.speed*Math.sin(e.posi[2]),
                            0
                        ], bord: e.fill}, self);
                        e.cold -= config.bullet.rate;
                    } 
                }
                if(e.upda){
                    self.send('update', [i,j,e.posi,e.mome]);
                    e.upda = false;
                }
            }
        }
        // Generate random asteriods
        if(config.generate){
            for(var i = 0; i < config.asteriod.generate.length; i++){
                var prob = config.asteriod.generate[i]*delta;
                for(var j = 0; j < Math.floor(prob); j++) var ast = new entity({type:1,leve:i}, self);
                if(Math.random()<prob%1) var ast = new entity({type:1,leve:i}, self);
            }
        }
    };
    this.interval = setInterval(this.run, 1000/config.fps, this);

    // Response to current
    this.current = function(){
        var dat = {entity:[], date: Number(new Date())};
        for(var i = 0; i < this.entity.length; i++){
            dat.entity.push([]);
            for(var j = 0; j < this.entity[i].length; j++){
                var e = this.entity[i][j];
                dat.entity[i].push({
                    posi: e.posi,
                    mome: e.mome,
                    poly: e.poly,
                    bord: e.bord,
                    fill: e.fill
                });
            }
        }
        return JSON.stringify(dat);
    };

    // Turn into client server
    this.host = function(net){
        this.send = (name, data) => {
            net.send(name, data);
            this.send_passthrough(name, data);
        };
        net.socket.on('player-joined', name=>{
            this.players[name] = new entity({type: 0, name: name}, this);
        });
        net.socket.on('current-request', fn=>{
            console.log('SENDING REQUEST');
            fn(123);//this.current());
        });

    };
}

// render   - Responsible for rendering a specific server
function render(parent=document.body){
    // The Space where the entities will be rendered into
    this.space = document.createElement('canvas');
    this.space.setAttribute('style', 'position:fixed;right:0;top:0;width:100%;height:100%;background:none;image-rendering:pixelated;object-fit:contain');
    this.space.setAttribute('width', config.space[0]);
    this.space.setAttribute('height', config.space[1]);
    this.spaceCTX = this.space.getContext('2d');
    this.spaceCTX.filter = 'url(#retro)';
    // The Glowing canvas to make it look retro
    this.glows = document.createElement('canvas');
    this.glows.setAttribute('style', 'position:fixed;right:0;top:0;width:100%;height:100%;background:none;object-fit:contain');
    this.glows.setAttribute('width', config.space[0]);
    this.glows.setAttribute('height', config.space[1]);
    this.glowsCTX = this.glows.getContext('2d');
    this.glowsCTX.filter = 'blur(5px)';
    // Seperate rendering datas
    this.entity = [...Array(config.entities)].map(e => []);
    this.effect = [];
    // Binding
    this.bind = function(e){
        // Binded to socket
        if(e.constructor.name == 'socket'){
            e.socket.on('update', dat=>{
                var k = this.entity[dat[0]][dat[1]];
                if(k == undefined) return console.log('Error: entity requested does not exist');
                k.posi = dat[2];
                k.mome = dat[3];
            });
            e.socket.on('created', dat=>{
                this.entity[dat[0]].push(dat[1]);
            });
            e.socket.on('deleted', dat=>{
                delete this.entity[dat[0]][dat[1]];
                this.entity[dat[0]].splice(dat[1], 1);
            });
            e.socket.on('particle', dat=>{

                for(var i = 0; i < 20; i++){
                    var a = Math.random()*2*Math.PI;
                    this.effect.push(dat[1][0], dat[1][1], dat[2]*(0.5+0.5*Math.random())*Math.cos(a)+dat[3][0]*0.2, dat[2]*(0.5+0.5*Math.random())*Math.sin(a)+dat[3][1]*0.2, 0.5+Math.random());
                }
            });
            e.current(data=>{
                this.entity = data.entity;
                this.render(this, data.date);
            });
            this.updateinterval = setInterval(()=>e.current(data=>{
                this.entity = data.entity;
                this.render(this, data.date);
            }), 5000);
            
        
        // Binded to Server
        } else if(e.constructor.name == 'server'){
            this.entity = e.entity;
            e.send_passthrough = (name, data) => {
                if(name == 'particle'){
                    for(var i = 0; i < 20; i++) this.effect.push(data[1][0], data[1][1], data[2]*(0.7+0.3*Math.random()), Math.random()*2*Math.PI, 0.5+Math.random());
                }
            };
        }
    };
    // Rendering
    this.time = new Date();
    this.fps = 0;
    this.tfps = 0;
    this.clear = function(){
        this.spaceCTX.clearRect(0, 0, config.space[0], config.space[1]);
        this.glowsCTX.clearRect(0, 0, config.space[0], config.space[1]);
    };
    this.render = function(self, past_time=0){
        // Calculate last change
        self.clear();
        var tmp_time = new Date();
        var delta = (tmp_time-(past_time == 0 ? self.time : past_time))/1000;
        self.time = tmp_time;
        delete tmp_time;
        
        // Draw effects
        self.spaceCTX.strokeStyle = '#AAA';
        for(var i = 0; i < self.effect.length; i += 5){
            self.spaceCTX.globalAlpha = self.effect[i+4] < 0.5 ? self.effect[i+4]*2 : 1;
            self.spaceCTX.beginPath();
            self.spaceCTX.moveTo(self.effect[i], self.effect[i+1]);
            self.spaceCTX.lineTo(self.effect[i], self.effect[i+1]+1);
            self.spaceCTX.stroke();

            self.effect[i  ] += self.effect[i+2]*delta;
            self.effect[i+1] += self.effect[i+3]*delta;
            self.effect[i+4] -= delta;
            if(self.effect[i+4] <= 0){
                self.effect.splice(i, 5);
                i -= 5;
            }
        }
        self.spaceCTX.globalAlpha = 1;

        // Draw entities
        for(var i = self.entity.length-1; i >= 0; i--){
            for(var j = 0; j < self.entity[i].length; j++){
                var e = self.entity[i][j];
                // Physics update
                e.posi[0] += e.mome[0]*delta;
                e.posi[1] += e.mome[1]*delta;
                e.posi[2] = (((e.posi[2]+e.mome[2]*delta)%(2*Math.PI))+2*Math.PI)%(2*Math.PI);//simply.limitAngle(e.posi[2]+e.mome[2]*delta);

                // Player Border
                if(i == 0){
                    if(e.posi[0] < config.player.border) e.posi[0] = config.player.border;
                    if(e.posi[1] < config.player.border) e.posi[1] = config.player.border;
                    if(e.posi[0] > config.space[0]-config.player.border) e.posi[0] = config.space[0]-config.player.border;
                    if(e.posi[1] > config.space[1]-config.player.border) e.posi[1] = config.space[1]-config.player.border;
                }

                // Draw entitites
                self.spaceCTX.strokeStyle = e.bord;
                self.spaceCTX.fillStyle = e.fill;
                self.spaceCTX.beginPath();
                for(var n = 0; n < e.poly.length; n+=2){
                    var x = Math.cos(e.poly[n+1]+e.posi[2])*
                                     e.poly[ n ]+e.posi[0];
                    var y = Math.sin(e.poly[n+1]+e.posi[2])*
                                     e.poly[ n ]+e.posi[1];
                    if(n == 0) self.spaceCTX.moveTo(x,y);
                    else self.spaceCTX.lineTo(x,y);
                }
                self.spaceCTX.closePath();
                self.spaceCTX.fill();
                self.spaceCTX.stroke();
            }
        }

        // Draw glowing effect
        self.glowsCTX.drawImage(self.space, 0, 0);
    }
    this.loop = function(){
        this.interval = setInterval(this.render, 1000/config.fps, this);
        this.interval_clock = setInterval(()=>{
            this.fps = this.tfps;
            this.tfps = 0;
        }, 1000);
    }
    // Initiate function
    parent.append(this.glows);
    parent.append(this.space);
    this.loop();
}

// socket   - Responsible for creating a socket relationship between each modules
function socket(room=undefined, type=undefined, name=''){
    this.socket = io();
    this.active = false;
    this.join = (room, type, name) => {
        this.socket.emit('join', {room:room, type:type, name:name});
        this.room = room;
        this.type = type;
        this.name = name;
        this.active = true;
    };
    this.send = (name, data)=>{
        if(this.active) this.socket.emit(name, data);
    };
    this.current = (f)=>{
        if(!this.active) return f({entity:[]});
        simply.http({url: `/current`, arg: {room: this.room}, enc: 'json', get: data => f(data), err: err => console.log(`ERROR ${err}`)});
    };


    if(room != undefined && type != undefined) this.join(room, type, name);
}


// exporting
if(typeof module != 'undefined') module.exports = {config, simply, entity, server, render, socket};