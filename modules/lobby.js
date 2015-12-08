var Vec2 = require('./vec2');
var Room = require('./room');
var Pickable = require('./pickable');
var CANNON = require('.././node_modules/cannon');


function Lobby() {
    this.rooms = [ ];

}


Lobby.prototype.join = function(client) {
    var room = null;
    for(var i = 0; i < this.rooms.length; i++) {
        if (this.rooms[i].clients.length < 24) {
            room = this.rooms[i];
            break;
        }
    }

    if (! room) {
        // console.log('room add');
        room = new Room();
        this.rooms.push(room);
        room.on('update', Lobby.prototype.update);
        room.loop.start();

        // destroy
        var self = this;
        room.on('leave', function() {
            if (this.clients.length > 0)
                return;

            room.loop.stop();
            var ind = self.rooms.indexOf(room);
            self.rooms.splice(ind, 1);
            // console.log('room destroy');
        });
    }

    room.join(client);
};



// room update
Lobby.prototype.update = function() {
    var room = this;
    var now = Date.now();
    var self = this;
    var world = this.world;
    var winner = null;

    // game state to send
    var state = { };


    var fixedTimeStep = 1.0 / 60.0; // seconds
    var maxSubSteps = 3;
    world.physicsWorld.step(fixedTimeStep,0.1,maxSubSteps);

    // for each tank
    world.forEach('tank', function(tank) {
        tank.update();

        if (! tank.dead) {
            // tank-tank collision
            world.forEachAround('tank', tank, function(tankOther) {
                if (tank === tankOther || tankOther.dead)
                    return;

                // check for collision
                var dist = tank.pos.dist(tankOther.pos);
                if (dist < tank.radius + tankOther.radius) {
                    // collided
                    Vec2.alpha
                    .setV(tank.pos)
                    .sub(tankOther.pos)
                    .norm()
                    .mulS(dist - (tank.radius + tankOther.radius));
                    // move apart
                    tank.pos.sub(Vec2.alpha);
                    tankOther.pos.add(Vec2.alpha);
                }
            });

            // tank-block collision
            world.forEachAround('block', tank, function(block) {
                var point = block.collideCircle(tank);
                if (point)
                    tank.pos.add(point);
            });

            // tank-pickable collision
            world.forEachAround('pickable', tank, function(pickable) {
                if (! pickable.collideCircle(tank))
                    return;

                

                switch(pickable.type) {
                    case 'repair':
                        tank.score += 2;
                        tank.level += 2;
                        for (var i = 0; i < 2; i++) {
                            tank.counter = 0;
                            tank.speed = Math.max(tank.speed*0.994,0.075);
                            tank.radius = tank.radius + 0.0075;
                            tank.coolDown = Math.max(500,(tank.coolDown)*0.996);
                            tank.range<=14?tank.range += 0.06: tank.range=tank.range;
                        };
                        break;
                    case 'damage':
                        // give 3 bullets
                        //tank.bullets += 3;
                        tank.score += 0.1;
                        tank.level += 0.1;
                        tank.counter += 1;
                        if (tank.counter == 10){
                            tank.counter = 0;
                            tank.speed = Math.max(tank.speed*0.994,0.075);
                            tank.radius = tank.radius + 0.0075;
                            tank.coolDown = Math.max(500,(tank.coolDown)*0.996);
                            tank.range<=14?tank.range += 0.06: tank.range=tank.range;
                        }
                        break;
                    case 'shield':
                        // don't pickup if shield already full
                        if (tank.shield == 10)
                            return;
                        // set full shield
                        tank.shield = 10;
                        break;
                }

                world.remove('pickable', pickable);

                state.pickableDelete = state.pickableDelete || [ ];
                state.pickableDelete.push({
                    id: pickable.id
                });

                self.pickables[pickable.ind].picked = now;
                self.pickables[pickable.ind].item = null;

                pickable.delete();
            });
        }

        // update in world
        tank.node.root.updateItem(tank);

        // shoot
        if (! tank.dead && tank.shooting && ! tank.reloading) {
            // new bullet
            var bullet = tank.shoot();
            world.add('bullet', bullet);
            world.physicsWorld.addBody(bullet.rigidBody);

            // publish
            state.bullets = state.bullets || [ ];
            console.log(bullet.data);
            state.bullets.push(bullet.data);
        }
    });


    // respawn pickables
    for(var i = 0; i < this.pickables.length; i++) {
        var pickable = this.pickables[i];
        if (! pickable.item && (now - pickable.picked) > pickable.delay) {
            pickable.item = new Pickable({
                type: pickable.type,
                x: pickable.x,
                y: pickable.y
            });
            pickable.item.ind = i;
            world.add('pickable', pickable.item);

            state.pickable = state.pickable || [ ];
            state.pickable.push(pickable.item.data);
        }
    }


    // for each bullet
    world.forEach('bullet', function(bullet) {
        // bullet update
        bullet.update();

        console.log(bullet.data);
        state.bulletsUpdate = state.bulletsUpdate || [ ];
        state.bulletsUpdate.push(bullet.data);


        var deleting = false;
        if (bullet.pos.dist(bullet.target) < 1) {
            deleting = true;
        } else if (bullet.pos[0] <= bullet.radius+0.1 ||
                   bullet.pos[1] <= bullet.radius+0.1 ||
                   bullet.pos[0] >= world.width-bullet.radius - 0.1 ||
                   bullet.pos[1] >= world.height-bullet.radius - 0.1) {
            deleting = true;
            // publish
            state.bulletsDelete = state.bulletsDelete || [ ];

            state.bulletsDelete.push({
                id: bullet.id,
                x: parseFloat(bullet.pos[0].toFixed(2), 10),
                y: parseFloat(bullet.pos[1].toFixed(2), 10)
            });

            // remove from world
            world.remove('bullet', bullet);
            world.physicsWorld.removeBody(bullet.rigidBody);
            bullet.delete();

        } else {
            // for each tank around
            world.forEachAround('tank', bullet, function(tank) {
                // refuse tank if any of conditions not met
                if (deleting ||  // bullet already hit the target
                    tank.dead ||  // tank is dead
                    tank === bullet.owner ||  // own bullet
                    now - tank.respawned <= 4000 ||  // tank just respawned
                    tank.pos.dist(bullet.pos) > (tank.radius + bullet.radius)) {  // no collision
                    return;
                }

                // hit
                bullet.hit = true;
                bullet.pos.setV(tank.pos);

                if (! bullet.owner.deleted) {
                    // damage tank
                    var damage = bullet.damage;

                    tank.tHit = now;

                    // if has shield
                    if (tank.shield) {
                        if (tank.shield > damage) {
                            // enough to sustain whole damage
                            tank.shield -= damage;
                            damage = 0;
                        } else {
                            // shielded only some damage
                            damage -= tank.sheild;
                            tank.shield = 0;
                        }
                    }

                    if (damage) {
                        tank.hp -= damage;

                        // killed, give point
                        if (tank.hp <= 0) {
                            
                            // add score
                            for(i = 0; i<=(tank.score/2); i++){
                                bullet.owner.level++;
                                bullet.owner.speed = Math.max(bullet.owner.speed*0.994,0.075);
                                bullet.owner.radius = bullet.owner.radius + 0.0075;
                                bullet.owner.coolDown = Math.max(500,(bullet.owner.coolDown)*0.996);
                                bullet.owner.range<=14?bullet.owner.range += 0.06: bullet.owner.range=bullet.owner.range;
                                bullet.owner.score++;
                                bullet.owner.hp = 10;
                            }

                            tank.score = 0;

                            // winner?
                            // if (bullet.owner.team.score === 32)
                            //     winner = bullet.owner.team;
                            // total score
                            room.score++;
                            bullet.owner.owner.send('point', 1);
                            // remember killer
                            tank.killer = bullet.owner.id;
                            // respawn
                            tank.respawn();
                        }
                    }
                }

                // bullet delete
                deleting = true;
                bullet.publish = true;
            });

            if (! deleting) {
                // for each block around
                world.forEachAround('block', bullet, function(block) {
                    if (deleting)
                        return;

                    // collision with level block
                    var point = block.collideCircle(bullet);
                    if (point) {
                        bullet.pos.add(point);
                        bullet.publish = true;
                        deleting = true;
                    }
                });
            }
        }

        if (! deleting) {
            // update in world
            bullet.node.root.updateItem(bullet);

        } else {
            // delete bullet

            // publish
            if (bullet.publish) {
                state.bulletsDelete = state.bulletsDelete || [ ];

                state.bulletsDelete.push({
                    id: bullet.id,
                    x: parseFloat(bullet.pos[0].toFixed(2), 10),
                    y: parseFloat(bullet.pos[1].toFixed(2), 10)
                });
            }

            // remove from world
            world.remove('bullet', bullet);
            world.physicsWorld.removeBody(bullet.rigidBody);
            bullet.delete();
        }
    });

    // winner?
    if (winner) {
        state.winner = {
            team: winner.id,
            scores: [ ]
        };

        // team scores
        for(var i = 0; i < 4; i++) {
            state.winner.scores[i] = this.teams[i].score;
            this.teams[i].score = 0;
        }

        // tanks scores
        world.forEach('tank', function(tank) {
            tank.score = 0;
            tank.scoreLast = -1;
            tank.killer = null;
            tank.respawn();
        });

        // room score
        room.score = 0;
        room.scoreLast = -1;
    }

    // for each tank
    world.forEach('tank', function(tank) {
        // state data
        state.tanks = state.tanks || [ ];

        // tank data
        var obj = {
            id: tank.id,
            x: parseFloat(tank.pos[0].toFixed(2), 10),
            y: parseFloat(tank.pos[1].toFixed(2), 10),
            a: Math.floor(tank.angle),
            level: tank.score,
            name: tank.nickname,
            energy: tank.bullets
        };

        if (tank.dead) { // dead
            obj.dead = true;
            // killer
            if (tank.killer !== undefined) {
                obj.killer = tank.killer;
                tank.killer = undefined;
            }
        } else { // alive
            // hp
            obj.hp = parseFloat(tank.hp.toFixed(2), 10);
            // shield
            if (tank.shield)
                obj.sp = tank.shield;
        }

        // score
        if (tank.scoreLast !== tank.score) {
            tank.scoreLast = tank.score;
            obj.s = tank.score;
        }

        // add to state
        state.tanks.push(obj);
    });

    // teams score
    if (room.score !== room.scoreLast) {
        room.scoreLast = room.score;

        state.teams = [ ];
        for(var i = 0; i < 4; i++)
            state.teams[i] = this.teams[i].score;
    }

    // publish data
    this.publish('update', state);
};


module.exports = Lobby;
