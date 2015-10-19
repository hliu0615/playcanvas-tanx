var Vec2 = require('./vec2');
var color = require('./color');
var Bullet = require('./bullet');

var tankIds = 0;


function Tank(client) {
    //name
    var adj = [
                'fleshy',
                'awesome',
                'sweet',
                'gypsy',
                'arcane',
                'fancy',
                'fiery',
                'Dr.',
                'sexy',
                'spicy',
                'rocky',
                'effy'
            ];
    
    var noun = [
        'bean',
        'jazz',
        'boob',
        'rock',
        'underwear',
        'breeze',
        'president',
        'apple',
        'noodle',
        'pants',
        'hair',
        'weed'
    ];
    
    var randomNumber = Math.floor(Math.random()*adj.length);
    var randomNumber2 = Math.floor(Math.random()*noun.length);

    this.deleted = false;

    this.nickname = adj[randomNumber]+' '+noun[randomNumber2];
    this.id = ++tankIds;
    this.owner = client;
    client.tank = this;
    // this.hue = Math.floor(Math.random() * 360);
    this.radius = .075;

    this.scoreLast = 0;
    this.score = 0;

    this.pos = Vec2.new(0, 0);
    this.movementDirection = Vec2.new();

    this.speed = 0.04;
    // this.speed = 0.5;
    this.range = 4.0;

    this.tHit = 0;
    this.tRecover = 0;

    this.hp = 10.0;
    this.shield = 0;
    this.bullets = 0;

    this.shooting = false;
    this.lastShot = 0;
    this.reloading = false;
    this.coolDown = 1000;

    
    this.killer = null;
    this.died = Date.now();
    this.dead = true;
    this.respawned = Date.now();

    this.level = 1;



    this.angle = Math.random() * 360;
}


Tank.prototype.delete = function() {
    this.deleted = true;

    this.pos.delete();
    this.movementDirection.delete();
    this.owner = null;
};


Tank.prototype.shoot = function() {
    if (this.deleted || this.dead) return;

    var now = Date.now();
    this.tHit = now;
    this.reloading = true;
    this.lastShot = now;
    var bullet = new Bullet(this);
    bullet.damage += this.level/2;
    if (this.bullets > 0) {
        this.bullets--;
        bullet.special = true;
        bullet.damage += 2;
        bullet.speed += .2;
    }
    return bullet;
};


Tank.prototype.respawn = function() {
    if (this.deleted || this.dead) return;
    this.dead = true;
    this.died = Date.now();



    this.radius = .075;

    this.score = 0;

    this.speed = 0.04;

    this.range = 4.0;
    // this.speed = 0.5;

    this.level = 1;

};


Tank.prototype.update = function() {
    if (this.deleted) return;

    var now = Date.now();

    if (! this.dead) {
        // movement
        if (this.movementDirection.len())
            this.pos.add(Vec2.alpha.setV(this.movementDirection).norm().mulS(this.speed));

        // reloading
        if (this.reloading && now - this.lastShot > this.coolDown)
            this.reloading = false;

        // auto recover
        if (this.hp < 10 && now - this.tHit > 3000 && now - this.tRecover > 1000) {
            this.hp = Math.min(this.hp + 1, 10);
            this.tRecover = now;
        }
    } else {
        // dead
        if (now - this.died > 5000) {
            this.dead = false;
            this.hp = 10;
            this.shield = 0;
            this.bullets = 0;
            this.respawned = now;
            this.pos.setXY(2.5 + ((this.team.id % 2) * 35) + Math.floor(Math.random() * 9), 2.5 + (Math.floor(this.team.id / 2) * 35) + Math.floor(Math.random() * 9));
        }
    }
};


Object.defineProperty(
    Tank.prototype,
    'data', {
        get: function() {
            return {
                id: this.id,
                team: this.team.id,
                owner: this.owner.id,
                pos: [ parseFloat(this.pos[0].toFixed(3), 10), parseFloat(this.pos[1].toFixed(3), 10) ],
                angle: Math.floor(this.angle),
                hp: this.hp,
                shield: this.shield,
                dead: this.dead,
                score: this.score,
                level: this.level,
                nickname: this.nickname
            };
        },
        set: function() { }
    }
);

module.exports = Tank;
