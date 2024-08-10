var serv,
    room = new URLSearchParams(window.location.search).get('room'),
    host = new URLSearchParams(window.location.search).get('host'),
    play = {return:-1},
    padd = 200,
    rain = 0,
    rbow = 5,
    q = x=>document.querySelector(x),
    play = (f,v=1)=>{var a = new Audio(`/sfx/${f}.wav`);a.volume=v;a.play()};


if(room != null){
    galactic_strike['room'] = room;
    galactic_strike['sock'] = io;
}
if(host != null) galactic_strike['host'] = host;

serv = new engine(galactic_strike);
if(host != null) serv.hosting(host, io);

// Prepare Canvases
var canv = c=>{
    c.setAttribute('width', padd+serv.config.space[0]);
    c.setAttribute('height', serv.config.space[1]);
    return c;
};
var dc = canv(document.createElement('canvas'));
var dx = dc.getContext('2d');
//dx.filter = 'url(#retro)';
dx.lineWidth = 1;
dx.font = '7px arcade';
dx.textAlign = 'center';
dx.textBaseline = 'top';
var rt = canv(document.createElement('canvas'));
var rpx = 0, rpy = 0, rs = 30000;
var rx = rt.getContext('2d');
//rx.filter = 'url(#retro)';

rx.lineWidth = 1;
rx.strokeStyle = '#FFF';
var ln = canv(q('#line'));
var lx = ln.getContext('2d');
lx.globalAlpha = 0.85;
var sr = canv(q('#star'));
var sx = sr.getContext('2d');
var gw = canv(q('#glow'));
var gx = gw.getContext('2d');
gx.filter = 'blur(5px)';
var py = canv(q('#play'));
var px = py.getContext('2d');

// Generate stars
for(var i = 0; i < 500; i++){
    sx.globalAlpha = 0.5*Math.pow(Math.random(),2);
    var t = Math.pow(1-2*Math.random(),3);
    sx.fillStyle = `rgb(${t>0?255:255+100*t},${255-50*Math.abs(t)},${t<0?255:255-100*t})`;
    sx.beginPath();
    sx.arc(Math.random()*(padd+serv.config.space[0]), Math.random()*serv.config.space[1], Math.random()*1.5, 0, 2 * Math.PI);
    sx.fill();
}

// Menu Interface
if(serv.status == 0) q('#menu>span').innerHTML = 'Connecting to Server';
q('#menu>input').onkeyup = function(e){
    q('#menu>span').innerHTML = '';
    if(e.keyCode == 13) q('#menu>button').click();
};
q('#menu>button').onclick = function(){
    if(q('#menu>input').value == ''){
        q('#menu').classList.remove('on');
        q('#game').classList.add('on');
        return;
    }
    play = serv.play(q('#menu>input').value, 0);
    if(play.return != 0) q('#menu>span').innerHTML = ['Name cannot be blank', 'Name is already taken'][play.return-1];
    else {
        q('#menu').classList.remove('on');
        q('#game').classList.add('on');
    }
};

// Player Controls
var key = [0,0,0,0,0,0,0,0];
var key_bind = ['w','a','s','d','arrowup','arrowleft','arrowdown', 'arrowright'];
document.addEventListener('keydown', function(e){
    var p = key_bind.indexOf(e.key.toLocaleLowerCase());
    if(p != -1) key[p] = 1;
});
document.addEventListener('keyup', function(e){
    var p = key_bind.indexOf(e.key.toLocaleLowerCase());
    if(p != -1) key[p] = 0;
});

// Dust Particle
var dus = [];
var dam = [];
serv.on('collide', data=>{
    for(var i = 0; i < 10; i++) dus.push(
        data[0].posi[0],
        data[0].posi[1],
        data[0].mome[0]*Math.pow(1-2*Math.random(),2),
        data[0].mome[1]*Math.pow(1-2*Math.random(),2),
        0.5+Math.random(),
        '#FFF',
    );
    if((data[1].indexOf(0) != -1 || data[1].indexOf(2) != -1) && Math.round(data[0].damage) != 0) dam.push(data[0].posi[0], data[0].posi[1], Math.round(data[0].damage), 1, '#F00');
});
serv.on('explode', data=>{
    for(var i = 0; i < data.size/5; i++) dus.push(
        data.posi[0],
        data.posi[1],
        (data.mome[0]+data.size*(1-2*Math.random()))*Math.pow(Math.random(),2),
        (data.mome[1]+data.size*(1-2*Math.random()))*Math.pow(Math.random(),2),
        0.5+Math.random(),
        data.color,
    );
});
serv.on('created', data=>{
    if(data[1] == 0) play('extraShip');
    if(data[1] == 2) play('fire', 0.2);
});
serv.on('deleted', data=>{
    if(data[1] == 0) play('extraShip');
    if(data[0].posi[0] > 0 && data[0].posi[0] < serv.config.space[0] &&
       data[0].posi[1] > 0 && data[0].posi[1] < serv.config.space[1] ){
        if(data[1] == 1) play('bangSmall');
        else if(data[1] == 4) play('glassShatter'+Math.floor(2*Math.random()));
    }
});
serv.on('playerdie', data=>{
    play('playerDie');
});

// Powerups
serv.on('collide', data=>{
    if(data[1].indexOf(0) != -1 && data[1].indexOf(3) != -1){
        var pi = data[1].indexOf(3);
        var u = serv.entity[3][data[2][pi]]; // Powerup
        var p = serv.entity[0][data[2][1-pi]]; // Player
        // Damage
        if(u.leve == 0)
            dam.push(p.posi[0], p.posi[1], '2x damage', 1, '#0F0');
        // Health
        else if(u.leve == 1)
            dam.push(p.posi[0], p.posi[1], '+100', 1, '#0F0');
        // Health
        else if(u.leve == 2)
            dam.push(p.posi[0], p.posi[1], '+shield', 1, '#0F0');

        play('powerup');
    }
});

// Server Error
serv.on('error', err=>{
    if(q('#menu').classList.contains('on')){
        q('#menu>span').innerHTML = err;
    }
});
// Start Server
serv.on('active', ()=>{
    q('#menu>span').innerHTML = '';
});
serv.start({pre:delta=>{
    // Clear Canvas
    dx.clearRect(0, 0, padd+serv.config.space[0], serv.config.space[1]);

    // Draw DUST effect
    for(var i = 0; i < dus.length; i+=6){
        dx.strokeStyle = dus[i+5] == 'RAIN' ? `hsl(${rain},100%,50%)` : dus[i+5];
        dx.beginPath();
        dx.moveTo(padd+dus[i], dus[i+1]);
        dx.lineTo(padd+dus[i], dus[i+1]+1);
        dx.stroke();

        dus[i  ] += dus[i+2]*delta;
        dus[i+1] += dus[i+3]*delta;
        dus[i+4] -= delta;
        if(dus[i+4] <= 0){
            dus.splice(i, 6);
            i -= 6;
        }
    }


    // Player
    if(play.return == 0){
        var acc = [0, 0, 0];
        acc[0] = key[3]-key[1];
        acc[1] = key[2]-key[0];
        var h = Math.hypot(acc[0], acc[1])/500;
        if(h != 0){
            acc[0] /= h;
            acc[1] /= h;
        }
        if(key[4]+key[5]+key[6]+key[7] != 0){
            var a = Math.PI+Math.atan2(key[4]-key[6],key[5]-key[7])-play.entity.posi[2];
            if(a >  Math.PI) a -= 2*Math.PI;
            if(a < -Math.PI) a += 2*Math.PI;
            acc[2] = a-play.entity.mome[2]*0.1;
            acc[2] *= 50;
        }
        play.acce(acc, delta);
    }

    // Rainbow
    rain += delta*360/rbow;
    rain %= 360;
    
    // Line effect
    rx.globalAlpha = 0.04;
    rx.beginPath();
    rx.moveTo(rpx, rpy);
    rpx = rpx+rs*delta;
    rx.lineTo(rpx, rpy);
    if(rpx > padd+serv.config.space[0]){
        rpx = 1;
        rpy += 4;
    }
    if(rpy > serv.config.space[1]) rpy = 0;
    rx.stroke();
    rx.globalAlpha = 1;

}, dur: (e,t)=>{
    // Lower opacity of dead players
    if(e.dead != 0) dx.globalAlpha = 0.2;

    // Render special double-bullet
    if(t == 2 && e.heal > 20){
        dx.lineWidth = 3;
        dx.strokeStyle = `hsl(${rain},100%,50%)`;
        dx.beginPath();
        for(var n = 0; n < e.poly.length; n+=2){
            var x = Math.cos(e.poly[n+1]+e.posi[2])*
                            e.poly[ n ]+e.posi[0]+padd;
            var y = Math.sin(e.poly[n+1]+e.posi[2])*
                            e.poly[ n ]+e.posi[1];
            if(n == 0) dx.moveTo(x,y);
            else dx.lineTo(x,y);
        }
        dx.closePath();
        dx.stroke();
        dx.lineWidth = 1;
    }

    // Draw shape
    dx.strokeStyle = e.bord == 'RAIN' ? `hsl(${rain},100%,50%)` : e.bord;
    dx.fillStyle = e.fill == 'RAIN' ? `hsl(${rain},100%,50%)` : e.fill;
    dx.beginPath();
    for(var n = 0; n < e.poly.length; n+=2){
        var x = Math.cos(e.poly[n+1]+e.posi[2])*
                        e.poly[ n ]+e.posi[0]+padd;
        var y = Math.sin(e.poly[n+1]+e.posi[2])*
                        e.poly[ n ]+e.posi[1];
        if(n == 0) dx.moveTo(x,y);
        else dx.lineTo(x,y);
    }
    dx.closePath();
    dx.fill();
    dx.stroke();

    // Draw player tags
    if(e.name != ''){
        dx.font = '6px arcade';
        dx.fillStyle = '#FFF';
        var xhl = Math.min(e.heal, 100);
        dx.fillText(e.name, padd+e.posi[0], e.posi[1]-e.span-(e.dead == 0 ? 20 : 5));

        // Health Bar
        if(e.dead == 0){
            dx.fillStyle = `hsl(${100*xhl/e.mxhl},100%,50%)`;
            dx.beginPath();
            dx.rect(padd+e.posi[0]-e.span, e.posi[1]-e.span-10, 2*e.span*xhl/e.mxhl, 5);
            dx.fill();
            dx.beginPath();
            dx.rect(padd+e.posi[0]-e.span, e.posi[1]-e.span-10, 2*e.span, 5);
            dx.stroke();
        }

        // Lives
        dx.fillStyle = '#F00';
        for(var i = 0; i < serv.config.entity[t].lives; i++){
            if(i == e.live) dx.fillStyle = '#A00'
            dx.beginPath();
            dx.arc(padd+e.posi[0]-e.span+2+6*i, e.posi[1]-e.span+2, 2, 0, 2*Math.PI);
            dx.fill();
        }
        
        // Render bomb range
        if(e.bomb > 0){
            dx.strokeStyle = '#FA6';
            dx.beginPath();
            for(var n = 0; n < e.poly.length; n+=2){
                var x = Math.cos(e.poly[n+1]+e.posi[2])*
                                (e.poly[n]+4)+e.posi[0]+padd;
                var y = Math.sin(e.poly[n+1]+e.posi[2])*
                                (e.poly[n]+4)+e.posi[1];
                if(n == 0) dx.moveTo(x,y);
                else dx.lineTo(x,y);
            }
            dx.closePath();
            dx.stroke();
            
            dx.beginPath();
            dx.arc(e.posi[0]+padd, e.posi[1], serv.config.entity[t].bomb_range*(3-e.bomb)/3, 0, 2*Math.PI);
            dx.stroke();
        }

        // Render shield
        if(e.shld > 0){
            dx.strokeStyle = '#0FF';
            dx.beginPath();
            for(var n = 0; n < e.poly.length; n+=2){
                var x = Math.cos(e.poly[n+1]+e.posi[2])*
                                (e.poly[n]+2)+e.posi[0]+padd;
                var y = Math.sin(e.poly[n+1]+e.posi[2])*
                                (e.poly[n]+2)+e.posi[1];
                if(n == 0) dx.moveTo(x,y);
                else dx.lineTo(x,y);
            }
            dx.closePath();
            dx.stroke();

            dx.fillStyle = '#0FF';
            dx.beginPath();
            dx.rect(padd+e.posi[0]-e.span, e.posi[1]+e.span+5, 2*e.span*e.shld/50, 5);
            dx.fill();
            dx.beginPath();
            dx.rect(padd+e.posi[0]-e.span, e.posi[1]+e.span+5, 2*e.span, 5);
            dx.stroke();
        }
    }

    // Return opacity
    if(e.dead != 0) dx.globalAlpha = 1;

}, suf: delta=>{
    
    // Damage points display   
    for(var i = 0; i < dam.length; i+=5){
        dx.fillStyle = dam[i+4];
        dx.font = `${dam[i+3]<0.25?dam[i+3]*28:7}px arcade`;
        dx.fillText(dam[i+2], padd+dam[i], dam[i+1]);
        dam[i+3] -= delta;
        if(dam[i+3] <= 0){
            dam.splice(i, 5);
            i -= 5;
        }
    }

    // Scoreboard
    var scores = [...serv.scores].sort((a,b)=>(b[1]-a[1])); 
    dx.clearRect(0, 0, padd, serv.config.space[1]);
    dx.strokeStyle = '#AAA';
    dx.beginPath();
    dx.moveTo(padd-5, 20);
    dx.lineTo(padd-5, serv.config.space[1]-40);
    dx.stroke();
    dx.fillStyle = '#FFF';
    dx.font = '15px arcade';
    dx.fillText('HIGHSCORES', (padd-5)/2, 10);
    dx.font = '12px arcade';
    for(var i = 0; i < Math.min(20,scores.length); i++){
        dx.textAlign = 'left';
        dx.fillText(scores[i][0], 20, 60+30*i);
        if(scores[i][2] != 0 && scores[i][0] in serv.player){
            dx.strokeStyle = serv.player[scores[i][0]].entity.fill;
            dx.strokeText(scores[i][2] == serv.config.lives ? scores[i][0] : scores[i][0].slice(0,-scores[i][0].length*(1-scores[i][2]/serv.config.lives)), 20, 60+30*i);
        }
        dx.textAlign = 'right';
        dx.fillText(Math.round(scores[i][1]), padd-20, 60+30*i);
    }
    dx.textAlign = 'center';

    // Draw Layers
    px.clearRect(0, 0, padd+serv.config.space[0], serv.config.space[1]);
    gx.clearRect(0, 0, padd+serv.config.space[0], serv.config.space[1]);
    
    //dx.clearRect(serv.config.space[0], 0, padd, serv.config.space[1]);
    px.drawImage(dc, 0, 0);
    gx.drawImage(dc, 0, 0);

    // Line effect
    lx.clearRect(0, 0, padd+serv.config.space[0], serv.config.space[1]);
    lx.drawImage(rt, 0, 0);
    rx.clearRect(0, 0, padd+serv.config.space[0], serv.config.space[1]);
    rx.drawImage(ln, 0, 0);

}});