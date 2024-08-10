class engine {
    // Configurations
    config = {
        exit: 60,
        fps: 60,
        space: [640,360],
        generate: true,
        delay: 0.1,
        physics: {
            collision_coeff: 0.1,
            max_velocity: 400
        },
        entity: []
    };
    status = 0;

    // Event Management
    listen = [];
    errors = [];
    event(name, data=undefined){
        if(name == 'error') this.errors.push(data);
        for(var i = 0; i < this.hoster.length; i++)
            this.hoster[i].emit('event', {name:name,data:data});
        for(var i = 0; i < this.listen.length; i++)
            if(this.listen[i][0] == name)
                this.listen[i][1].call(this, data);
            else if(this.listen[i][0] == 'event')
                this.listen[i][1].call(this, {name:name,data:data});
    }
    on(event, act){
        if(event == 'active' && (this.status == 3 || this.status == 4)) act();
        this.listen.push([event, act]);
    }

    // Socket
    socket;
    hoster = [];
    client(room, sock){
        if(this.status != 0) return this.event('error', 'Server is no longer inactive, can\'t set it has a client');
        this.status = 1;
        this.socket = sock();
        var id = Number(new Date());
        this.socket.emit('join_req', {id:id, room:room});
        this.socket.on('join_res', data=>{
            if(data.id == id){
                if(data.error == undefined){
                    this.status = 4;
                    this.config = data.config;
                    this.entity = data.entity;
                    this.event('active');
                } else {
                    this.status = 2;
                    this.event('error', data.error);
                }
                this.socket.off('join_res');
            }
        });
        this.socket.on('event', data=>{
            if(data.name == 'created') this.entity[data.data[1]][data.data[2]] = data.data[0];
            this.event(data.name, data.data)
        });
    }
    hosting(room, sock){
        var s = sock();
        this.hoster.push(s);
        var id = Number(new Date());
        s.emit('join_req', {id:id, host:room});
        s.on('join_res', data=>{
            if(data.id == id){
                if(data.error != undefined) this.event('error', data.error);
                s.off('join_res');
            }
        });
        s.on('join_req', data=>{
            s.emit('join_res', {
                id: data.id,
                config: this.config,
                entity: this.entity
            });
        });
        s.on('play_req', data=>{
            if(data.name in this.player){
                s.emit('play_res', {id:data.id, error: 'Name is already taken'});
            } else {
                //this.play(data.name, 0);
                this.subply[data.id] = this.play(data.name, 0);
                s.emit('play_res', data);
            }
        });
        s.on('play_vel', data=>{
            if(!(data.id in this.subply)) this.subply[data.id] = this.play(data.name, 0);
            this.subply[data.id].velo = data.velo;
            this.subply[data.id].appl = data.appl;
        });
        s.on('play_end', data=>{
            console.log(`Disconnect:${this.subply[data.id].name}, ID:${this.subply[data.id].id}`);
            delete this.player[this.subply[data.id].name];
            this.delete(0, this.subply[data.id].id);
            delete this.subply[data.id];
        });
    }

    // Entity Management
    delete(type, id){
        if(this.entity[type][id] == undefined) return;
        this.event('deleted', [this.entity[type][id], type, id]);
        if(this.entity[type] == undefined || this.entity[type][id] == undefined) return this.event('error', `Can't delete entity type ${type} of ID ${id}`);
        delete this.entity[type][id];
    }
    create(type, arg={}){
        if(this.config.entity[type] == undefined) return this.event('error', `Entity of type ${type} is not defined`);
        if(this.entity[type] == undefined) this.entity[type] = [];
        var id = 0;
        for(id = 0; id <= this.entity[type].length; id++)
            if(this.entity[type][id] == undefined)
                break;
        this.entity[type][id] = {
            posi: [0,0,0],
            mome: [0,0,0],
            poly: [],
            leve: 0,
            heal: 100,
            mxhl: 100,
            name: '',
            bord: '',
            fill: '',
            dead: 0,

            span: 0,
            mass: 0,
            cold: 0,
        };
        Object.assign(this.entity[type][id], arg);
        if(this.config.entity[type].oncreate != undefined)
            this.config.entity[type].oncreate(this.entity[type][id], this, this.config.entity[type], type, id);
        Object.assign(this.entity[type][id], arg);
        this.event('created', [this.entity[type][id], type, id]);
        return [type, id];
    }
    probgen(type, delta=1, para={}){
        for(var j = 0; j < this.config.entity[type].generate.length; j++){
            var prob = this.config.entity[type].generate[j]*delta;
            Object.assign(para, {leve: j});
            for(var k = 0; k < Math.floor(prob)+(Math.random()<prob%1); k++) this.create(type, para);
        }
    }
    collide(a, b){
        // Check if both are close enough for a collision check
        var collide_distance = Math.hypot(
            b.posi[0] - a.posi[0],
            b.posi[1] - a.posi[1]
        );
        if(collide_distance > a.span+b.span) return {collide:false};

        // Get collision angle
        var collide_angle = Math.PI+Math.atan2(
            a.posi[1] - b.posi[1],
            a.posi[0] - b.posi[0]
        );

        // Interate for every point of "b"
        for(var n = 0; n < b.poly.length; n+=2){
            // Find angle and distance of point of "b" to center of "a"
            var dx = b.posi[0]+Math.cos(b.posi[2]+b.poly[n+1])*b.poly[n] - a.posi[0];
            var dy = b.posi[1]+Math.sin(b.posi[2]+b.poly[n+1])*b.poly[n] - a.posi[1];
            var theta = Math.PI+Math.atan2(-dy, -dx);
            var distance = Math.hypot(dx, dy);

            // Find edge of "a" b might collide to a point of "b"
            var hitpoint = [-1, -1];
            for(var k = 0; k < a.poly.length; k+=2){
                if(a.poly[k+1] > (((theta-a.posi[2])%(2*Math.PI))+2*Math.PI)%(2*Math.PI)){
                    hitpoint[1] = k;
                    break;
                } else hitpoint[0] = k;
            }
            if(hitpoint[0] == -1) hitpoint[0] = a.poly.length-1;
            if(hitpoint[1] == -1) hitpoint[1] = 0;

            // Find the minimum distance from point of "b" to center of "a" to be considered collided
            var delta = (((theta-a.posi[2])%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
            var hit_dx = a.poly[hitpoint[0]]*Math.cos(a.poly[hitpoint[0]+1])
                    - a.poly[hitpoint[1]]*Math.cos(a.poly[hitpoint[1]+1]);
            var hit_dy = a.poly[hitpoint[0]]*Math.sin(a.poly[hitpoint[0]+1])
                    - a.poly[hitpoint[1]]*Math.sin(a.poly[hitpoint[1]+1]);
            var minimum = (
                hit_dx*a.poly[hitpoint[0]]*Math.sin(a.poly[hitpoint[0]+1]) -
                hit_dy*a.poly[hitpoint[0]]*Math.cos(a.poly[hitpoint[0]+1])
            )/(
                hit_dx*Math.sin(delta) -
                hit_dy*Math.cos(delta)
            );
            if(distance > minimum) continue;

            // Calculate collision force (F=m*a)
            var collision = Math.hypot(a.mome[0], a.mome[1])
                            * Math.cos(Math.abs(collide_angle-Math.PI-Math.atan2(-a.mome[1], -a.mome[0])))
                        - Math.hypot(b.mome[0], b.mome[1])
                            * Math.cos(Math.abs(collide_angle-Math.PI-Math.atan2(-b.mome[1], -b.mome[0])));
            if(collision <= 0) return {collide:false};
            
            // Do damage
            var dam = Math.min(a.heal, b.heal, this.config.physics.collision_coeff*collision);
            a.heal -= dam;
            b.heal -= dam;
            a.coll  = collide_angle;
            b.coll  = collide_angle+Math.PI;

            // Calculate ratio of mass
            var mass_ratio = a.mass/b.mass;

            // Pass Momentum
            a.mome[0] -= collision*Math.cos(collide_angle)*Math.cos(theta-collide_angle)/mass_ratio;
            a.mome[1] -= collision*Math.sin(collide_angle)*Math.cos(theta-collide_angle)/mass_ratio;
            a.mome[2] += collide_angle-theta;
            b.mome[0] += collision*Math.cos(collide_angle)*mass_ratio;
            b.mome[1] += collision*Math.sin(collide_angle)*mass_ratio;
            b.mome[2] -= collide_angle-theta;

            // End
            return {collide:true, posi: [
                b.posi[0]+Math.cos(b.posi[2]+b.poly[n+1])*b.poly[n],
                b.posi[1]+Math.sin(b.posi[2]+b.poly[n+1])*b.poly[n],
                collide_angle
            ], collision: collision, mome: [
                a.mome[0]+b.mome[0],
                a.mome[1]+b.mome[1],
                0
            ], damage: dam};
        }
        return {collide:false};
    }

    // Player
    player = {};
    subply = {};
    scores = [];
    play(name, type, id=-1){
        if(name == '') return {return: 1};
        if(name in this.player) return {return: 2};
        if(id == -1){
            var loc = this.create(type);
            id = loc[1];
        }
        this.entity[type][id].name = name;
        this.scores.push([name, 0, this.config.lives]);
        this.player[name] = {
            return: 0,
            name: name,
            type: type,
            id: id,
            entity: this.entity[type][id],
            velo: [0,0,0],
            appl: [false, false, false],
            scor: this.scores[this.scores.length-1],
            acce: function(acce, delta){
                this.entity.mome[0] += (acce[0]-this.entity.mome[0])*(delta>1?1:delta);
                this.entity.mome[1] += (acce[1]-this.entity.mome[1])*(delta>1?1:delta);
                this.entity.mome[2] += (acce[2]-this.entity.mome[2])*(delta>1?1:delta);
            },
            velo: function(velo, delta){
                var dc = Math.pow(0.1, delta);
                this.entity.mome[0] = this.entity.mome[0]*(1-dc)+velo[0]*dc;
                this.entity.mome[1] = this.entity.mome[1]*(1-dc)+velo[1]*dc;

            }
        };
        return this.player[name];
    }
    
    // Simulation
    time;
    loop;
    start = function(arg={}){
        this.on('active', ()=>{
            this.time = new Date();
            this.loop = setInterval(()=>this.run(arg), 1000/this.config.fps);
        });
    };
    stop = function(){
        clearInterval(loop);
    };
    run = function(arg={}){
        // Initialize delta
        var delta = ((new Date())-this.time)/1000;
        this.time = new Date();
        
        // Player Control Momentum
        for(const k in this.subply){
            var r = Math.pow(0.01,delta);
            if(this.subply[k].appl[0]) this.subply[k].entity.mome[0] = this.subply[k].entity.mome[0]*this.config.delay+(1-this.config.delay)*this.subply[k].velo[0];//this.subply[k].entity.mome[0]*r+this.subply[k].velo[0]*(1-r);
            if(this.subply[k].appl[1]) this.subply[k].entity.mome[1] = this.subply[k].entity.mome[1]*this.config.delay+(1-this.config.delay)*this.subply[k].velo[1];//this.subply[k].entity.mome[1]*r+this.subply[k].velo[1]*(1-r);
            //if(this.subply[k].appl[2]) this.subply[k].entity.posi[2] += (this.subply[k].velo[2]-this.subply[k].entity.mome[2])*0.9;
            
            if(this.subply[k].appl[2]){
                var da = this.subply[k].velo[2]-this.subply[k].entity.posi[2];
                if(da >  Math.PI) da -= 2*Math.PI;
                if(da < -Math.PI) da += 2*Math.PI;
                this.subply[k].entity.mome[2] = /*this.subply[k].entity.mome[2]*this.config.delay+(1-this.config.delay)**/da*10;
            }
        }

        // Pre-func
        if('pre' in arg) arg['pre'].call(this, delta);

        // Loop each entity
        for(var i = 0; i < this.entity.length; i++){
            var c = this.config.entity[i];
            for(var j = 0; j < this.entity[i].length; j++){
                var e = this.entity[i][j];
                if(e == undefined) continue;

                // Collisions
                if(e.dead == 0) for(var i2 = 0; i2 < this.entity.length; i2++){
                    var c2 = this.config.entity[i2];
                    if((c.collide != undefined  && c.collide[i2] == false)||
                       (c2.collide != undefined && c2.collide[i] == false)) continue;
                    for(var j2 = 0; j2 < this.entity[i2].length; j2++){
                        var e2 = this.entity[i2][j2];
                        if(e2 == undefined) continue;
                        if(e2.dead != 0) continue;
                        var col = this.collide(e, e2);
                        if(col.collide){
                            this.event('collide', [col,[i,i2],[j,j2]]);
                            if(c.oncollide != undefined)
                                c.oncollide([e,e2],this,[c,c2], [i,i2], [j,j2], col);
                            if(c2.oncollide != undefined)
                                c2.oncollide([e2,e],this,[c2,c], [i2,i], [j2,j], col);
                        }
                    }
                }

                // Momentum
                var h = Math.hypot(e.mome[0], e.mome[1]);
                if(h > this.config.physics.max_velocity){
                    var a = Math.PI+Math.atan2(-e.mome[1],-e.mome[0]);
                    e.mome[0] = Math.cos(a)*this.config.physics.max_velocity;
                    e.mome[1] = Math.sin(a)*this.config.physics.max_velocity;
                }
                e.posi[0] += e.mome[0]*delta;
                e.posi[1] += e.mome[1]*delta;
                e.posi[2] = (((e.posi[2]+e.mome[2]*delta)%(2*Math.PI))+2*Math.PI)%(2*Math.PI);

                // Elliminate exited entities
                if(this.status == 3)
                if(e.posi[0] <                     -this.config.exit ||
                   e.posi[0] > this.config.space[0]+this.config.exit ||
                   e.posi[1] <                     -this.config.exit ||
                   e.posi[1] > this.config.space[1]+this.config.exit )
                    return this.delete(i, j);

                // Events
                if(c.onupdate != undefined) c.onupdate(e, this, c, i, j, delta);
                if(c.ondeath != undefined && e.heal <= 0) c.ondeath(e, this, c, i, j, delta);

                // Execute dur-func
                if('dur' in arg) arg['dur'].call(this, e, i);
            }
            // Random Generation
            if(this.config.generate && this.status == 3 && c.generate != undefined) this.probgen(i, delta);
        }

        // suf-func
        if('suf' in arg) arg['suf'].call(this, delta);
    }

    // Properties
    constructor(arg={}){
        Object.assign(this.config, arg);
        this.entity = [...Array(this.config.entity.length)].map(e=>[]);
        this.time = new Date();
        if(this.config.room == undefined && this.config.sock == undefined) this.status = 3;
        else if(Boolean(this.config.room != undefined) !== Boolean(this.config.sock != undefined)) this.event('error', 'Either config room and sock(socket) must be defined or neither, ignoring both');
        else this.client(this.config.room, this.config.sock);
    }
}
if(typeof module != 'undefined') module.exports = engine;