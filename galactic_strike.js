var galactic_strike = {
    exit: 60,
    fps: 60,
    space: [640,630],
    generate: true,
    delay: 0.1,
    physics: {
        collision_coeff: 0.2,
        max_velocity: 500
    },
    lives: 3,
    entity: [
        // PLAYER
        {
            border: 20,
            speed: 200,
            delay: 0.8,
            rate: 0.15,
            dammul: 2,
            lives: 3,
            bomb_range: 150,
            oncreate: (e,s,c,t,i)=>{
                e.posi = [
                    Math.random()*(s.config.space[0]-c.border*2)+c.border,
                    Math.random()*(s.config.space[1]-c.border*2)+c.border,
                    Math.random()*2*Math.PI
                ];
                e.poly = [10, 0, 8, 0.8*Math.PI, 3, Math.PI, 8, 1.2*Math.PI];
                e.fill = `hsl(${360*(2*i+1-Math.pow(2,1+Math.floor(Math.log2(i))))/Math.pow(2, Math.ceil(Math.log2(i+1)))},100%,50%)`;
                e.bord = '#FFF';
                e.heal = 100;
                e.mxhl = 100;
                e.span = 10;
                e.mass = 50;
                e.mult = 0;
                e.shld = 0;
                e.tphl = 0;
                e.bomb = 0;
                e.live = s.config.lives;
            },
            onupdate: (e,s,c,t,i,delta)=>{
                // Transfer damage to shield
                if(e.shld != 0 && e.heal != e.tphl){
                    e.shld -= e.tphl-e.heal;
                    e.heal = e.tphl;
                    if(e.shld < 0){
                        e.heal += e.shld;
                        e.shld = 0;
                    }
                }

                // Player border
                if(e.posi[0] < c.border){ e.posi[0] = c.border; e.mome[0] = 0 }
                if(e.posi[1] < c.border){ e.posi[1] = c.border; e.mome[1] = 0 }
                if(e.posi[0] > s.config.space[0]-c.border){ e.posi[0] = s.config.space[0]-c.border; e.mome[1] = 0 }
                if(e.posi[1] > s.config.space[1]-c.border){ e.posi[1] = s.config.space[1]-c.border; e.mome[1] = 0 }

                // Respawn
                if(e.dead < 0) e.dead = 0;
                else if(e.dead > 0) e.dead -= delta;

                // Bomb Exploding
                if(e.bomb < 0) e.bomb = 0;
                else if(e.bomb > 0){
                    e.bomb -= delta;
                    if(e.bomb <= 0){
                        for(var n = 0; n < s.entity.length; n++){
                            for(var k = 0; k < s.entity[n].length; k++){
                                if(n == t && k == i) continue;
                                if(s.entity[n][k] == undefined) continue;
                                var d = Math.hypot(
                                    e.posi[0] - s.entity[n][k].posi[0],
                                    e.posi[1] - s.entity[n][k].posi[1]
                                );
                                if(d < c.bomb_range){
                                    s.player[e.name].scor[1] += [Math.min(s.entity[n][k].heal, 80), 2, 0, 0, 4][n];
                                    s.entity[n][k].leve = 0;
                                    s.entity[n][k].heal = 0;
                                }
                            }
                        }
                        s.event('userbomb', [e.posi]);
                    }
                }

                // Player shooting
                if(e.dead != 0) return;
                e.cold += delta;
                if(e.cold>c.rate){
                    var heal = 20;
                    if(e.mult > 0){
                        heal *= c.dammul;
                        e.mult -= delta;
                    }
                    if(e.mult < 0) e.mult = 0;
                    s.create(2, {posi: [
                        e.posi[0]+(e.span+1+s.config.entity[2].size/2)*Math.cos(e.posi[2]),
                        e.posi[1]+(e.span+1+s.config.entity[2].size/2)*Math.sin(e.posi[2]),
                        e.posi[2],
                    ], mome: [
                        s.config.entity[2].speed*Math.cos(e.posi[2]),
                        s.config.entity[2].speed*Math.sin(e.posi[2]),
                        0
                    ], bord: e.fill, player:e.name, heal:heal, mxhl:heal });
                    e.cold = e.cold%c.rate;
                } 
            },
            oncollide: (e,s,c,t,i,col)=>{
                if(e.name != '' && t[1] == 2 && e[1].player != undefined){
                    var sub = Math.min(s.player[e[0].name].scor[1], 20);
                    var subx = Math.min(s.player[e[0].name].scor[1], 80);
                    s.player[e[1].player].scor[1] += sub;
                    s.player[e[0].name].scor[1] -= sub;
                    if(e[0].heal == 0) s.player[e[1].player].scor[1] += subx;
                }
            },
            ondeath: (e,s,c,t,i)=>{
                s.event('explode', {type:t, size:200, posi:e.posi, mome:e.mome, color: e.fill});
                s.event('playerdie', {e:e, t:t, i:i});
                e.live--;
                s.player[e.name].scor[2] = e.live;

                // Reset
                e.dead = 5;
                e.heal = 100;
                e.bomb = 0;
                e.mult = 0;
                if(e.name != '' && e.live == 0){
                    s.scores.push([e.name, 0, s.config.lives]);
                    s.player[e.name].scor = s.scores[s.scores.length-1];
                    e.live = c.lives;
                }
            }
        },
        // ASTERIOD
        {
            generate: [0.5, 0.5, 1],
            span: 59,
            size: [10, 20, 30],
            health: [20, 50, 100],
            bumpy_amount: 20,
            bumpy_percentage: 0.2,
            initial_speed: 100,
            oncreate: (e,s,c,t,i)=>{
                e.poly = [];
                for(var i = 0; i < c.bumpy_amount; i++){
                    var h = c.size[e.leve]*(1-c.bumpy_percentage)+Math.random()*c.size[e.leve]*c.bumpy_percentage;
                    if(h > e.span) e.span = h;
                    e.poly.push(h, 2*Math.PI*i/c.bumpy_amount);
                }
                var dir = Math.floor(Math.random()*4);
                var spe = [
                    Math.random()*c.initial_speed,
                    (Math.random()*2-1)*c.initial_speed
                ];
                e.posi = [
                    dir>1? Math.random()*s.config.space[0] : (dir==0 ? -c.span : s.config.space[0]+c.span),
                    dir>1? (dir==2 ? -c.span : s.config.space[1]+c.span) : Math.random()*s.config.space[1],
                    Math.random()*2*Math.PI
                ];
                e.mome = [
                    (dir==1?-1:1)*spe[dir>1?1:0],
                    (dir==3?-1:1)*spe[dir>1?0:1],
                    (Math.random()*2-1)*Math.PI
                ];
                e.heal = c.health[e.leve];
                e.mxhl = e.heal;
                e.fill = '#333';
                e.bord = '#aaa';
                e.mass = c.size[e.leve];
            },
            oncollide: (e,s,c,t,i,col)=>{
                if(t[1] == 2 && e[1].player != undefined){
                    s.player[e[1].player].scor[1] += col.damage/10;
                    if(e[0].heal == 0) s.player[e[1].player].scor[1] += 2;
                }
            },
            ondeath: (e,s,c,t,i)=>{
                //s.probgen(3, 0.5, {posi:e.posi, mome:e.mome});
                if(e.leve == 0){
                    s.event('explode', {type:t, size:c.size[0], posi:e.posi, mome:e.mome, color:e.bord});
                } else {
                    var h = Math.hypot(e.mome[0], e.mome[1]);
                    var g = Math.PI+Math.atan2(-e.mome[1], -e.mome[0]);
                    s.create(1, {leve: e.leve-1, posi: [
                        e.posi[0]+Math.cos(e.coll+0.5*Math.PI)*c.size[e.leve]*0.8,
                        e.posi[1]+Math.sin(e.coll+0.5*Math.PI)*c.size[e.leve]*0.8,
                        e.posi[2]
                    ], mome: [
                        h*Math.cos(g-0.2),
                        h*Math.sin(g-0.2),
                        e.mome[2]
                    ]});
                    s.create(1, {leve: e.leve-1, posi: [
                        e.posi[0]+Math.cos(e.coll-0.5*Math.PI)*c.size[e.leve]*0.8,
                        e.posi[1]+Math.sin(e.coll-0.5*Math.PI)*c.size[e.leve]*0.8,
                        e.posi[2]
                    ], mome: [
                        h*Math.cos(g+0.2),
                        h*Math.sin(g+0.2),
                        e.mome[2]
                    ]});
                    s.event('explode', {type:t, size:c.size[0], posi:e.posi, mome:e.mome, color:e.bord});
                }
                s.delete(t, i);
            }
        },
        // BULLET
        {
            size: 10,
            speed: 500,
            oncreate: (e,s,c,t,i)=>{
                e.poly = [
                    c.size/2,
                    0,
                    c.size/2,
                    Math.PI
                ];
                e.heal = 20;
                e.mxhl = 20;
                e.span = c.size/2;
                e.mass = 0.01;
            },
            ondeath: (e,s,c,t,i)=>{
                s.delete(t, i);
            },
            onupdate: (e,s,c,t,i,delta)=>{
                if(e.heal != e.mxhl) s.delete(t,i);
            }
        },
        // POWERUP
        /*
            RED     Increase Damage
            GREEN   Health
            BLUE    Shield
            ORANGE  Bomb
        */
        {
            span: 59,
            initial_speed: 100,
            generate: [0.05, 0.1, 0.1, 0.08],
            collide: [true, false, false, false],
            fillcolor: ['#F66', '#6F6', '#66F', '#FA6'],
            bordcolor: ['#FEE', '#EFE', '#EEF', '#FFA'],
            heart: [],
            oncreate: (e,s,c,i)=>{
                e.poly = [];
                for(var i = 0; i < 16; i++) e.poly.push(10, 2*Math.PI*i/16);
                var dir = Math.floor(Math.random()*4);
                var spe = [
                    Math.random()*c.initial_speed,
                    (Math.random()*2-1)*c.initial_speed
                ];
                e.posi = [
                    dir>1? Math.random()*s.config.space[0] : (dir==0 ? -c.span : s.config.space[0]+c.span),
                    dir>1? (dir==2 ? -c.span : s.config.space[1]+c.span) : Math.random()*s.config.space[1],
                    Math.random()*2*Math.PI
                ];
                e.mome = [
                    (dir==1?-1:1)*spe[dir>1?1:0],
                    (dir==3?-1:1)*spe[dir>1?0:1],
                    (Math.random()*2-1)*Math.PI
                ];
                e.heal = 0.1;
                e.mxhl = 0.1;
                e.fill = c.fillcolor[e.leve];
                e.bord = c.bordcolor[e.leve];
                e.mass = 10;
            },
            oncollide: (e,s,c,t,i,col)=>{
                if(t[1] == 0){
                    // Increase Damage
                    if(e[0].leve == 0){
                        e[1].mult = 2;
                    // Heal
                    } else if(e[0].leve == 1){
                        e[1].heal = 100;
                        e[1].tphl = 100;
                    // Shield
                    } else if(e[0].leve == 2){
                        e[1].shld = 50;
                        e[1].tphl = e[1].heal;
                    // Bomb
                    } else if(e[0].leve == 3){
                        e[1].bomb = 3;
                    }
                }
            },
            ondeath: (e,s,c,t,i)=>{
                s.event('explode', {type:t, size:30, posi:e.posi, mome:e.mome, color:e.fill});
                s.delete(t, i);
            }
        },
        // ENEMY
        {
            generate: [0.1, 0.1, 0],
            span: 59,
            size: [10, 15, 30],
            health: [20, 40, 10000],
            vision: [400, 300],
            bumpy_amount: 20,
            bumpy_percentage: 0.2,
            initial_speed: 100,
            rate: [0.5, 0.3],
            oncreate: (e,s,c,t,i)=>{
                e.poly = [];
                zbc = (e.leve == 2 ? 8 : c.bumpy_amount);
                for(var i = 0; i < zbc; i++){
                    var h = 0;
                    if(e.leve == 0) h = c.size[e.leve]*Math.random();//c.size[e.leve]*(1-c.bumpy_percentage)+Math.random()*c.size[e.leve]*c.bumpy_percentage;
                    else if(e.leve == 1) h = c.size[e.leve]+10*Math.sin(16*Math.PI*i/c.bumpy_amount);
                    else if(e.leve == 2) h = i%2 == 0 ? c.size[e.leve] : c.size[e.leve]/10;
                    if(h > e.span) e.span = h;
                    if(e.leve == 2) e.poly.push(h, i%2 == 0 ? 2*Math.PI*(i-1)/zbc : 2*Math.PI*i/zbc);
                    else e.poly.push(h, 2*Math.PI*i/c.bumpy_amount);
                }
                var dir = Math.floor(Math.random()*4);
                if(e.leve == 2){
                    e.posi = [
                        dir>1? -c.span : s.config.space[0]+c.span,
                        dir%2==0? -c.span : s.config.space[1]+c.span,
                        Math.random()*2*Math.PI
                    ];
                    e.mome = [
                        dir>1? 100 : -100,
                        dir%2==0? 100 : -100,
                        Math.random()<0.5?-4*Math.PI:4*Math.PI//(Math.random()*2-1)*Math.PI
                    ];
                    e.mass = 1000;
                } else {
                    var spe = [
                        Math.random()*c.initial_speed,
                        (Math.random()*2-1)*c.initial_speed
                    ];
                    e.posi = [
                        dir>1? Math.random()*s.config.space[0] : (dir==0 ? -c.span : s.config.space[0]+c.span),
                        dir>1? (dir==2 ? -c.span : s.config.space[1]+c.span) : Math.random()*s.config.space[1],
                        Math.random()*2*Math.PI
                    ];
                    e.mome = [
                        (dir==1?-1:1)*spe[dir>1?1:0],
                        (dir==3?-1:1)*spe[dir>1?0:1],
                        (Math.random()*2-1)*Math.PI
                    ];
                    e.mass = c.size[e.leve];
                }
                e.heal = c.health[e.leve];
                e.mxhl = e.heal;
                e.fill = 'RAIN';
                e.bord = '#FFF';
            },
            oncollide: (e,s,c,t,i,col)=>{
                if(t[1] == 2 && e[1].player != undefined){
                    s.player[e[1].player].scor[1] += col.damage/5;
                    if(e[0].heal == 0) s.player[e[1].player].scor[1] += 4;
                }
            },
            onupdate: (e,s,c,t,i,delta)=>{
                // More enemy the less the players
                c.generate[0] = s.entity[0].length == 0 ? 4 : 4/s.entity.length;
                c.generate[1] = s.entity[0].length == 0 ? 2 : 2/s.entity.length;
                var mp = 0;
                for(var k = 0; k < Object.keys(s.player).length; k++){
                    var sc = s.player[Object.keys(s.player)[k]].scor[1];
                    if(sc > mp) mp = sc;
                }
                c.generate[0] += mp/1000;
                c.generate[1] += mp/1000;
                //if(s.entity[0].length != 0) if(10/s.entity[0].length < Math.random()*s.entity[4].length) e.heal = 0;

                // Dont shoot if close to exit border
                if(e.posi[0] < 0 || e.posi[0] > s.config.space[0] ||
                   e.posi[1] < 0 || e.posi[1] > s.config.space[1]) return;

                // Level 0 - Shoot everywhere
                if(e.leve == 0){
                    e.cold += delta;
                    if(e.cold>c.rate[e.leve]){
                        for(var n = 0; n < 4; n++){
                            s.create(2, {posi: [
                                e.posi[0]+(e.span+1+s.config.entity[2].size/2)*Math.cos(e.posi[2]+n*Math.PI*0.5),
                                e.posi[1]+(e.span+1+s.config.entity[2].size/2)*Math.sin(e.posi[2]+n*Math.PI*0.5),
                                e.posi[2]+n*Math.PI*0.5,
                            ], mome: [
                                s.config.entity[2].speed*Math.cos(e.posi[2]+n*Math.PI*0.5),
                                s.config.entity[2].speed*Math.sin(e.posi[2]+n*Math.PI*0.5),
                                0
                            ], bord: 'RAIN', enemy:true });
                        }
                        e.cold = e.cold%c.rate[e.leve];
                    }
                // Level 1 - Shoot at player
                } else if(e.leve == 1){
                    var mind = c.vision[e.leve], mina = 0, shoot = false;
                    for(var k = 0; k < s.entity[0].length+s.entity[4].length; k++){
                        // Prioritize players
                        if(k == s.entity[0].length && shoot == true) break;

                        // Ignore self to shoot
                        if(k-s.entity[0].length == i) continue;

                        // Prioritize closest entity
                        var a = k < s.entity[0].length ? s.entity[0][k] : s.entity[4][k-s.entity[0].length];
                        if(a == undefined) continue;
                        var d = Math.hypot(
                            a.posi[0]-e.posi[0],
                            a.posi[1]-e.posi[1]
                        );
                        if(d < mind){
                            // Ignore dead players
                            if(k < s.entity[0].length && a.dead != 0) continue;
                            // Level 0 : Just aim the at current position
                            var t = d/s.config.entity[2].speed;
                            var x2 = a.posi[0]+a.mome[0]*t;
                            var y2 = a.posi[1]+a.mome[1]*t;
                            var d2 = Math.hypot(
                                a.posi[0]-x2,
                                a.posi[1]-y2
                            );
                            var t2 = d2/s.config.entity[2].speed;
                            var xf = a.posi[0]+a.mome[0]*(t+t2)/2;
                            var yf = a.posi[1]+a.mome[1]*(t+t2)/2;

                            mina = Math.PI+Math.atan2(
                                e.posi[1]-yf,
                                e.posi[0]-xf
                            );
                            mina += 0.1-0.2*Math.random();
                            // Update target list
                            shoot = true;
                            mind = d;
                        }
                    }
                    // Enemy shooting
                    if(!shoot) return;
                    e.cold += delta;
                    if(e.cold>c.rate[e.leve]){
                        s.create(2, {posi: [
                            e.posi[0]+(e.span+1+s.config.entity[2].size/2)*Math.cos(mina),
                            e.posi[1]+(e.span+1+s.config.entity[2].size/2)*Math.sin(mina),
                            mina,
                        ], mome: [
                            s.config.entity[2].speed*Math.cos(mina),
                            s.config.entity[2].speed*Math.sin(mina),
                            0
                        ], bord: 'RAIN', enemy:true });
                        e.cold = e.cold%c.rate[e.leve];
                    }
                }
                
                   /*
                // Find closest player, if none then shoot themselvs
                var mind = c.vision[e.leve], mina = 0, shoot = false;
                for(var k = 0; k < s.entity[0].length+s.entity[4].length; k++){
                    // Prioritize players
                    if(k == s.entity[0].length && shoot == true) break;

                    // Ignore self to shoot
                    if(k-s.entity[0].length == i) continue;

                    // Prioritize closest entity
                    var a = k < s.entity[0].length ? s.entity[0][k] : s.entity[4][k-s.entity[0].length];
                    if(a == undefined) continue;
                    var d = Math.hypot(
                        a.posi[0]-e.posi[0],
                        a.posi[1]-e.posi[1]
                    );
                    if(d < mind){
                        // Ignore dead players
                        if(k < s.entity[0].length && a.dead != 0) continue;
                        // Level 0 : Just aim the at current position
                        if(e.leve == 0){
                            mina = Math.PI+Math.atan2(
                                e.posi[1]-a.posi[1],
                                e.posi[0]-a.posi[0]
                            );
                        // Level 1 : Predict the future position and aim there
                        } else if(e.leve == 1){
                            var t = d/s.config.entity[2].speed;
                            var x2 = a.posi[0]+a.mome[0]*t;
                            var y2 = a.posi[1]+a.mome[1]*t;
                            var d2 = Math.hypot(
                                a.posi[0]-x2,
                                a.posi[1]-y2
                            );
                            var t2 = d2/s.config.entity[2].speed;
                            var xf = a.posi[0]+a.mome[0]*(t+t2)/2;
                            var yf = a.posi[1]+a.mome[1]*(t+t2)/2;

                            mina = Math.PI+Math.atan2(
                                e.posi[1]-yf,
                                e.posi[0]-xf
                            );
                        }
                        // Update target list
                        shoot = true;
                        mind = d;
                    }
                }

                // Enemy shooting
                if(!shoot) return;
                e.cold += delta;
                if(e.cold>c.rate[e.leve]){
                    s.create(2, {posi: [
                        e.posi[0]+(e.span+1+s.config.entity[2].size/2)*Math.cos(mina),
                        e.posi[1]+(e.span+1+s.config.entity[2].size/2)*Math.sin(mina),
                        mina,
                    ], mome: [
                        s.config.entity[2].speed*Math.cos(mina),
                        s.config.entity[2].speed*Math.sin(mina),
                        0
                    ], bord: 'RAIN', enemy:true });
                    e.cold = e.cold%c.rate[e.leve];
                } */
            },
            ondeath: (e,s,c,t,i)=>{
                s.event('explode', {type:t, size:c.size[0]*10, posi:e.posi, mome:e.mome, color:'RAIN'});
                s.delete(t, i);
            }
        },
    ]
};
if(typeof module != 'undefined') module.exports = galactic_strike;