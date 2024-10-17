var map =      [[ 0,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [ 0,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1, 0, 0],
                [ 0,-1, 0, 0, 0,-1,-1,-1, 0, 0, 0, 0, 0, 0,-1, 0, 0,-1, 0, 0],
                [ 0,-1, 0, 0, 0,-1, 0,-1, 0, 0, 0, 0, 0, 0,-1,-1, 0,-1, 0, 0],
                [ 0,-1, 0, 0, 0,-1, 0,-1, 0,-1,-1,-1,-1, 0, 0,-1, 0,-1, 0, 0],
                [ 0,-1, 0, 0, 0,-1, 0,-1, 0,-1, 0, 0,-1, 0, 0,-1, 0,-1, 0, 0],
                [ 0,-1, 0, 0, 0,-1, 0,-1, 0,-1, 0, 0,-1, 0, 0,-1, 0,-1, 0, 0],
                [ 0,-1,-1,-1,-1,-1, 0,-1, 0,-1,-1,-1,-1,-1,-1,-1, 0,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0,-1, 0, 0, 0, 0,-1, 0, 0, 0, 0,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1, 0, 0, 0, 0,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1],
                [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];

var config = {
    type: Phaser.AUTO,
    parent: 'content',
    width: 1280,
    height: 832,
    physics: {
        default: 'arcade'
    },
    scene: {
        key: 'main',
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var graphics;
var path;
var wave = [[6, 2000], [6, 2000], [8, 1800], [4, 1000], [15, 1800], [4, 500]]
var waveNum = 0
var money = 100;
var moneyText;
var count = wave[0][0];
var spawnTime = wave[0][1];
var baseHp = 20;
var baseHpText;

function preload() {
    // load the game assets – enemy and turret atlas
    this.load.atlas('sprites', 'sprites/TD/towers.png', 'sprites/TD/towers.json');    
    this.load.image('bullet', 'sprites/player/player_health.png');
}


var Enemy = new Phaser.Class({
    Extends: Phaser.GameObjects.Image,
    initialize:
    function Enemy (scene)
    {
        Phaser.GameObjects.Image.call(this, scene, 0, 0, 'sprites', 'ghost');
        this.follower = { t: 0, vec: new Phaser.Math.Vector2() };
        this.ENEMY_SPEED = 1/25000;
        this.hp = 100;
    },
    
    startOnPath: function ()
    {
        // set the t parameter at the start of the path
        this.follower.t = 0;
        
        // get x and y of the given t point            
        path.getPoint(this.follower.t, this.follower.vec);
        
        // set the x and y of our enemy to the received from the previous step
        this.setPosition(this.follower.vec.x, this.follower.vec.y);
    },

    receiveDamage: function(damage) {
        this.hp -= damage;           
        
        // if hp drops below 0 we deactivate this enemy
        if(this.hp <= 0) {
            this.setActive(false);
            this.setVisible(false);
            enemyDead(this);
        }
    },

    update: function (time, delta)
    {
        // move the t point along the path, 0 is the start and 0 is the end
        this.follower.t += this.ENEMY_SPEED * delta;
        
        // get the new x and y coordinates in vec
        path.getPoint(this.follower.t, this.follower.vec);
        
        // update enemy x and y to the newly obtained x and y
        this.setPosition(this.follower.vec.x, this.follower.vec.y);
        // if we have reached the end of the path, remove the enemy
        if (this.follower.t >= 1)
        {
            this.setActive(false);
            this.setVisible(false);
            reachedEnd(this);
        }
    }
});

var Turret = new Phaser.Class({
    Extends: Phaser.GameObjects.Image,
    initialize:
    function Turret (scene)
    {
        Phaser.GameObjects.Image.call(this, scene, 0, 0, 'sprites', 'red_tower');
        this.nextTic = 0;
        this.fireRate = 1000
        this.range = 100
    },
    // we will place the turret according to the grid
    place: function(i, j) {            
        this.y = i * 64 + 64/2;
        this.x = j * 64 + 64/2;
        map[i][j] = 1;            
    },
    fire: function() {
        var enemy = getEnemy(this.x, this.y, this.range);
        if(enemy) {
            var angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
            addBullet(this.x, this.y, angle);
        }
    },
    update: function (time, delta)
    {
        if(time > this.nextTic) {
            this.fire();
            this.nextTic = time + this.fireRate;
        }
    }
});

var Bullet = new Phaser.Class({
    Extends: Phaser.GameObjects.Image,
    initialize:
    function Bullet (scene)
    {
        Phaser.GameObjects.Image.call(this, scene, 0, 0, 'bullet');
        this.dx = 0;
        this.dy = 0;
        this.lifespan = 0;
        this.speed = Phaser.Math.GetSpeed(600, 1);
        this.BULLET_DAMAGE = 50
    },
    fire: function (x, y, angle)
    {
        this.setActive(true);
        this.setVisible(true);
        //  Bullets fire from the middle of the screen to the given x/y
        this.setPosition(x, y);
        this.setRotation(angle + 250);
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.lifespan = 300;
    },
    update: function (time, delta)
    {
        this.lifespan -= delta;
        this.x += this.dx * (this.speed * delta);
        this.y += this.dy * (this.speed * delta);
        if (this.lifespan <= 0)
        {
            this.setActive(false);
            this.setVisible(false);
        }
    }
});

function create() {
    
    var graphics = this.add.graphics();    
    drawGrid(graphics)
    
    // the path for our enemies
    // parameters are the start x and y of our path
    path = this.add.path(96, -32);
    path.lineTo(96, 480);
    path.lineTo(352, 480);
    path.lineTo(352, 160);
    path.lineTo(484, 160);
    path.lineTo(484, 608);
    path.lineTo(804, 608);
    path.lineTo(804, 608);
    path.lineTo(804, 288);
    path.lineTo(612, 288);
    path.lineTo(612, 480);
    path.lineTo(996, 480);
    path.lineTo(996, 224);
    path.lineTo(932, 224);
    path.lineTo(932, 96);
    path.lineTo(1124, 96);
    path.lineTo(1124, 672);
    path.lineTo(1284, 672);

    graphics.lineStyle(3, 0xffffff, 1);
    // visualize the path
    path.draw(graphics);
    
    enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
    this.nextEnemy = 0;
    
    turrets = this.add.group({ classType: Turret, runChildUpdate: true });
    this.input.on('pointerdown', placeTurret);
    
    bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    
    this.physics.add.overlap(enemies, bullets, damageEnemy);

    moneyText = this.add.text(16, 804, 'Cash: 0', { fontSize: '32px', fill: '#0ff' });
    baseHpText = this.add.text(1050, 804, 'Health: 20', { fontSize: '32px', fill: '#0ff' });
}
 
function update(time, delta) {  
    if (waveNum > wave.length - 1) {
        waveNum = wave.length - 1
    }

    // if its time for the next enemy
    if (time > this.nextEnemy)
    {        
        var enemy = enemies.get();
        if (enemy && count > 0)
        {
            enemy.setActive(true);
            enemy.setVisible(true);
            
            // place the enemy at the start of the path
            enemy.startOnPath();
            
            this.nextEnemy = time + wave[waveNum][1];
            count -= 1
        } else {
            count = wave[waveNum][0]
            waveNum += 1
        }      
    }

    moneyText.setText('Cash: ' + money)
}

function drawGrid(graphics) {
    graphics.lineStyle(1, 0x0000ff, 0.8);
    for(var i = 0; i < 13; i++) {
        graphics.moveTo(0, i * 64);
        graphics.lineTo(1280, i * 64);
    }
    for(var j = 0; j < 20; j++) {
        graphics.moveTo(j * 64, 0);
        graphics.lineTo(j * 64, 768);
    }
    graphics.strokePath();
}

function placeTurret(pointer) {
    var i = Math.floor(pointer.y/64);
    var j = Math.floor(pointer.x/64);
    if (money >= 50) {
        if(canPlaceTurret(i, j)) {
            var turret = turrets.get();
            if (turret)
            {
                turret.setActive(true);
                turret.setVisible(true);
                turret.place(i, j);
            }
            
            money -= 50
            
        }
    }
}

function canPlaceTurret(i, j) {
    return map[i][j] === 0;
}

function addBullet(x, y, angle) {
    var bullet = bullets.get();
    if (bullet)
    {
        bullet.fire(x, y, angle);
    }
}

function getEnemy(x, y, distance) {
    var enemyUnits = enemies.getChildren();
    for(var i = 0; i < enemyUnits.length; i++) {       
        if(enemyUnits[i].active && Phaser.Math.Distance.Between(x, y, enemyUnits[i].x, enemyUnits[i].y) <= distance)
            return enemyUnits[i];
    }
    return false;
}

function damageEnemy(enemy, bullet) {  
    // only if both enemy and bullet are alive
    if (enemy.active === true && bullet.active === true) {
        // we remove the bullet right away
        bullet.setActive(false);
        bullet.setVisible(false);    
        
        // decrease the enemy hp with BULLET_DAMAGE
        enemy.receiveDamage(bullet.BULLET_DAMAGE);
    }

}

function enemyDead(enemy) {
    money += 10
}

function reachedEnd (enemy) {
 baseHp -= 1
 baseHpText.setText('Health: ' + baseHp)
 if (baseHp < 0) {
    gameOver();
 }
}

function gameOver() {

}