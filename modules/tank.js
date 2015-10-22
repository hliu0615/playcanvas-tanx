var Vec2 = require('./vec2');
var color = require('./color');
var Bullet = require('./bullet');

var tankIds = 0;


function Tank(client) {
    //name
    

    this.deleted = false;

    this.nickname = generateName();
    this.id = ++tankIds;
    this.owner = client;
    client.tank = this;
    // this.hue = Math.floor(Math.random() * 360);
    this.radius = .1;

    this.scoreLast = 0;
    this.score = 0;

    this.pos = Vec2.new(0, 0);
    this.movementDirection = Vec2.new();

    this.speed = 0.09;
    // this.speed = 0.5;
    this.range = 7.0;

    this.tHit = 0;
    this.tRecover = 0;
    this.tCharge = 0;

    this.hp = 10.0;
    this.shield = 0;
    this.bullets = 1;

    this.shooting = false;
    this.lastShot = 0;
    this.reloading = false;
    this.coolDown = 1000;

    
    this.killer = null;
    this.died = Date.now();
    this.dead = true;
    this.respawned = Date.now();

    this.level = 0;

    this.counter = 0;




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
    console.log("tank says his score is:");
    console.log(this.score);
    var now = Date.now();
    this.tHit = now;
    this.reloading = true;
    this.lastShot = now;
    if(this.bullets>=1){
        this.range = this.range*(3/2);
    }
    var bullet = new Bullet(this);
    if (this.bullets >= 1) {
        this.bullets--; 
        bullet.damage = 5;
        bullet.special = true;
        bullet.speed = bullet.speed*1.5;
        this.range = this.range*(2/3);
    }
    return bullet;
};


Tank.prototype.respawn = function() {
    if (this.deleted || this.dead) return;
    this.dead = true;
    this.died = Date.now();


    this.bullets = 1;
    this.radius = .1;

    this.score = 0;

    this.speed = 0.09;

    this.range = 7.0;
    // this.speed = 0.5;

    this.coolDown = 1000;
    this.level = 0;

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

        //charge
        if (this.bullets<3 && now - this.tCharge>220){
            if (!this.freezeCharge){
                this.bullets = this.bullets + 0.01;
                this.tCharge = now;
                if (this.bullets == 3){
                    this.freezeCharge = true;
                    this.tCharge = 0;
                }
            } else {
                this.tCharge = now;
                this.freezeCharge = false;
            }
            
        }
        
            
        // auto recover
        if (this.hp < 10 && now - this.tHit > 12500 && now - this.tRecover > 200) {
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

function generateName() {
        var adj = [
                'Mc.',
                'Sweet',
                'Gypsy',
                'Fancy',
                'Dr.',
                'Sexy',
                'Spicy',
                'Miss',
                'Mr',
                'Jewish',
                'Sneaky',
                'Little',
                'Giant',
                'Holy',
                'Lord',
                'Crunchy',
                'Sassy',
                'A Salty',
                'Male',
                'Female',
                'Drunken',
                'Wee',
                'Devilish',
                'Professor',
                'Officer',
                'A Young',
                'Creamy',
                'Diabolic',
                'Puffy',
                'President',
                'Homeless',
                'Rookie',
                'Goth',
                'Red',
                'Captain',
                'Magnificent',
                'Gigantic',
                'Humongous',
                'Baby',
                'Teenager',
                'A Wild',
                'American',
                'French',
                'Indian',
                'Legendary',
                'Epic',
                'Lana Del',
                'Sweaty'
            ];
    
    var noun = [
        'Bean',
        'Boob',
        'Panty',
        'Wax',
        'Teemo',
        'Goblin',
        'Pooper',
        'Ball',
        'Finger',
        'Hooter',
        'Crap',
        'Stark',
        'Bacon',
        'Boner',
        'Pope',
        'Clinton',
        'Hipster',
        'Troll',
        'Javascript',
        'Sausage',
        'Avenger',
        'Godzilla',
        'Rooster',
        'Hustler',
        'Pancake',
        'Turtle',
        'Pie',
        'Butcher',
        'Lamb',
        'Orange',
        'Mage',
        'Rogue',
        'Cop'
];
    
    var randomNumber = Math.floor(Math.random()*adj.length);
    var randomNumber2 = Math.floor(Math.random()*noun.length);
    var name = adj[randomNumber] + ' ' + noun[randomNumber2];

    return name
}

module.exports = Tank;
