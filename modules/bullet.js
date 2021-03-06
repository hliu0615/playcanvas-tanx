'use strict';

var Vec2 = require('./vec2');
var CANNON = require('.././node_modules/cannon');


var bulletIds = 0;
var tmpVec = Vec2.new();


function Bullet(owner) {
    this.deleted = false;

    this.owner = owner;
    this.id = ++bulletIds;
    this.damage = 2.5;
    this.speed = .265*(Math.max((1-owner.score*0.004),0.6));
    this.radius = Math.min(.3+0.0075*owner.score,0.78);
    this.pos = Vec2.new(parseFloat(this.owner.pos[0].toFixed(3), 10), parseFloat(this.owner.pos[1].toFixed(3), 10));
    this.target = Vec2.new().setR((-this.owner.angle + 90) * (Math.PI / 180.0)).mulS(this.owner.range).add(this.pos);

    this.target[0] = parseFloat(this.target[0].toFixed(3), 10);
    this.target[1] = parseFloat(this.target[1].toFixed(3), 10);


    var radius = 1; // m
    var sphereBody = new CANNON.Body({
       mass: 5, // kg
       position: new CANNON.Vec3(0, 0, 10), // m
       shape: new CANNON.Sphere(radius)
    });

    this.rigidBody = sphereBody;

}


Bullet.prototype.delete = function() {
    if (this.deleted)
        return;

    this.deleted = true;
    this.owner = null;
    this.pos.delete();
    this.target.delete();
};


Bullet.prototype.update = function() {
    if (this.deleted) return;

    tmpVec.setV(this.target).sub(this.pos).norm().mulS(this.speed).add(this.pos);
    if (! isNaN(tmpVec[0]))
        this.pos.setV(tmpVec);
};


Object.defineProperty(
    Bullet.prototype,
    'data', {
        get: function() {
            var obj = {
                id: this.id,
                tank: this.owner.id,
                x: parseFloat(this.pos[0].toFixed(2), 10),
                y: parseFloat(this.pos[1].toFixed(2), 10),
                tx: parseFloat(this.target[0].toFixed(2), 10),
                ty: parseFloat(this.target[1].toFixed(2), 10),
                sp: parseFloat(this.speed.toFixed(4), 10)
            };

            if (this.special)
                obj.s = true;

            return obj;
        },
        set: function() { }
    }
);


module.exports = Bullet;
