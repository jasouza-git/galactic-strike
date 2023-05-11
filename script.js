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
function Canvas(autoadd=true){
    this.dom = document.createElement('canvas');
    this.dom2 = document.createElement('canvas');
    this.dom2.setAttribute('style', 'position:fixed;right:0;top:0;width:100%;height:100%;background:none');
    this.dom.setAttribute('style', 'position:fixed;right:0;top:0;width:100%;height:100%;background:none;image-rendering:pixelated;image-rendering:crisp-edges');
    this.screen = [0, 0];
    this.ctx = this.dom.getContext('2d');
    this.ctx2 = this.dom2.getContext('2d');
    this.entity = [
        [], // Players
        [], // Asteriods
        [], // Bullets
    ];
    
    this.resize = function(){
        this.screen = [Math.round(1920/3), Math.round(1080/3)]
        /*[
            Math.floor(window.innerWidth/vars.res),
            Math.floor(window.innerHeight/vars.res)
        ];*/
        this.dom.setAttribute('width', this.screen[0]);
        this.dom.setAttribute('height', this.screen[1]);
        this.dom2.setAttribute('width', this.screen[0]);
        this.dom2.setAttribute('height', this.screen[1]);
        this.ctx.filter = 'url(#retro)';
        this.ctx2.filter = 'blur(5px)';
    };
    this.clear = function(){
        this.ctx.clearRect(0, 0, this.screen[0], this.screen[1]);
        this.ctx2.clearRect(0, 0, this.screen[0], this.screen[1]);
    };
    this.end = function(){
        clearInterval(this.interval);
    };
    this.time = new Date();
    this.run = function(self){
        self.clear();
        var tmp_time = new Date();
        var delta = (tmp_time-self.time)/1000;
        self.time = tmp_time;
        delete tmp_time;
        for(var i = self.entity.length-1; i >= 0; i--){
            for(var j = 0; j < self.entity[i].length; j++){
                var e = self.entity[i][j];
                // Physics update
                e.posi[0] += e.mome[0]*delta;
                e.posi[1] += e.mome[1]*delta;
                e.posi[2] = (((e.posi[2]+e.mome[2]*delta)%(2*Math.PI))+2*Math.PI)%(2*Math.PI);//run.limitAngle(e.posi[2]+e.mome[2]*delta);

                // Player Border
                if(i == 0){
                    if(e.posi[0] < vars.player.border) e.posi[0] = vars.player.border;
                    if(e.posi[1] < vars.player.border) e.posi[1] = vars.player.border;
                    if(e.posi[0] > self.screen[0]-vars.player.border) e.posi[0] = self.screen[0]-vars.player.border;
                    if(e.posi[1] > self.screen[1]-vars.player.border) e.posi[1] = self.screen[1]-vars.player.border;
                }

                // Draw entitites
                self.ctx.strokeStyle = e.bord;
                self.ctx.fillStyle = e.fill;
                self.ctx.beginPath();
                for(var n = 0; n < e.poly.length; n+=2){
                    var x = Math.cos(e.poly[n+1]+e.posi[2])*
                                     e.poly[ n ]+e.posi[0];
                    var y = Math.sin(e.poly[n+1]+e.posi[2])*
                                     e.poly[ n ]+e.posi[1];
                    if(n == 0) self.ctx.moveTo(x,y);
                    else self.ctx.lineTo(x,y);
                }
                self.ctx.closePath();
                self.ctx.fill();
                self.ctx.stroke();
            }
        }
        self.ctx2.drawImage(self.dom, 0, 0);
    };
    this.fps = 0;
    this.tfps = 0;
    if(autoadd){
        document.body.append(this.dom2);
        document.body.append(this.dom);
        this.resize();
        this.interval = setInterval(this.run, 1000/60, this);
        this.interval_clock = setInterval(function(self){
            self.fps = self.tfps;
            self.tfps = 0;
        }, 1000, this);
    };
}
var game = new Canvas();
var socket = io();
socket.emit('join', {room: 'main', type: 1});

socket.on('collide', dat=>{
    var a = game.entity[dat[0]][dat[1]];
    var b = game.entity[dat[2]][dat[3]];
    //if(a == undefined || b == undefined) return;
    a.posi = dat[4];
    b.posi = dat[5];
    a.mome = dat[6];
    b.mome = dat[7];
});
socket.on('update', dat=>{
    var e = game.entity[dat[0]][dat[1]];
    e.posi = dat[2];
    e.mome = dat[3];
});
socket.on('created', dat=>{
    game.entity[dat[0]].push(dat[1]);
});
socket.on('deleted', dat=>{
    //game.entity[dat[0]].
    delete game.entity[dat[0]][dat[1]];
    game.entity[dat[0]].splice(dat[1], 1);
});
function update(){
    var h = new XMLHttpRequest();
    h.onreadystatechange = function(){
        if (this.readyState == 4 && this.status == 200) {
            var data = JSON.parse(h.responseText);
            game.entity = data.entity;
        }
    };
    h.open('GET', `/current?room=main`, true);
    h.send();
}
update();
//setInterval(update, 2000);
//socket.on('update', dat=>{game.entity=dat.entity});
/*
var players = {};
var screen = new Canvas();
screen.updater = true;
screen.generate = true;

/*
var player = new Entity({type:0, name:'jason'}, screen);
var player2 = new Entity({type:0, name:'mary'}, screen);
var player3 = new Entity({type:0, name:'johnny'}, screen);
screen.clear();
player.draw();
player2.draw();
player3.draw();
//*/
/*
var a = new Entity({type:1, leve: 2, posi: [100, 100, 0], mome: [0, 0, 0]}, screen);
var b = new Entity({type:0, posi: [150, 70, 4/4*Math.PI], mome: [-50, 0, 0]}, screen);
/*
setInterval(()=>{
    var [name, vec] = ['cat', [-1, 0]];
    b.mome[0] = vars.player.delay    *b.mome[0]
              + (1-vars.player.delay)*vars.player.speed*vec[0];
    b.mome[1] = vars.player.delay    *b.mome[1]
              + (1-vars.player.delay)*vars.player.speed*vec[1];
}, 1000/30);
//*

var socket = io();
socket.on('player-enter', name=>{
    players[name] = screen.entity[0].length;
    var p = new Entity({type: 0, name: name}, screen);
});
socket.on('player-move', dat=>{
    var [name, vec] = dat;
    if(!(name in players)) return;
    var player = screen.entity[0][players[name]];
    player.mome[0] = vars.player.delay    *player.mome[0]
                   + (1-vars.player.delay)*vars.player.speed*vec[0];
    player.mome[1] = vars.player.delay    *player.mome[1]
                   + (1-vars.player.delay)*vars.player.speed*vec[1];
});
socket.on('player-shoot', dat=>{
    var [name, vec] = dat;
    if(!(name in players)) return;
    var player = screen.entity[0][players[name]];
    var theta = Angle(vec[0], vec[1]);
    var delta = theta-player.posi[2];
    if(delta >  Math.PI) delta -= 2*Math.PI;
    if(delta < -Math.PI) delta += 2*Math.PI;
    player.mome[2] = vars.player.delay    *player.mome[2]
                   + (1-vars.player.delay)*delta*5;
    if(player.mome[2] < -vars.player.spin) player.mome[2] = -vars.player.spin;
    if(player.mome[2] >  vars.player.spin) player.mome[2] =  vars.player.spin;
});

var updaten = 0;
screen.loopfunc = function(delta){
    updaten += delta;
    if(updaten > 1000/vars.update){
        socket.emit('entity-update', screen.entity);
        updaten = 0;
    }
};*/
