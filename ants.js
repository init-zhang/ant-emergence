const ANTS = 1;
const HOME_PHEROMONE_DISTANCE_SQUARED = 200 ** 2;
const HOME_PHEROMONE_POWER       = 1;
const HOME_PHEROMONE_FREQUENCY   = 10;
const HOME_PHEROMONE_LIFESPAN    = 400;
const FOOD_PHEROMONE_DISTANCE_SQUARED = 200 ** 2;
const FOOD_PHEROMONE_POWER       = 1;
const FOOD_PHEROMONE_FREQUENCY   = 10;
const FOOD_PHEROMONE_LIFESPAN    = 400;
const ANT_DISTANCE_SQUARED       = 20 ** 2;
const ANT_POWER                  = 1;
const MAX_VELOCITY     = 3;
const MAX_ACCELERATION = 0.3;
const LINE_MULTIPLIER = 5;
const TRAIL = 0.4;

function addRangeListener(sliderID, config, defaultValue) {
    const input = document.getElementById(sliderID);
    const span = document.getElementById(sliderID + "Value");
    input.value = defaultValue;
    span.textContent = input.value;
    input.addEventListener("input", () => {
        // Specific use case for distances as they need to be squared
        if (
            sliderID === "homePheromoneDistance" ||
            sliderID === "foodPheromoneDistance" ||
            sliderID === "antsDistance"
        ) {
            config[sliderID + "Squared"] = Number(input.value) ** 2;
        } else {
            config[sliderID] = Number(input.value);
        }
        span.textContent = input.value;
    });
}

function distanceSquared(u, v) {
    const dx = u.x - v.x;
    const dy = u.y - v.y;
    return dx * dx + dy * dy;
}

function randomInclusiveInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function degreeToRadians(degrees) {
    return degrees * Math.PI / 180;
}

class Ant {
    constructor(x, y, config, board) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.board = board

        this.angle = Math.random() * Math.PI * 2;
        this.viewingAngleHalf = degreeToRadians(45);

        this.leftHomePheromones = [];
        this.rightHomePheromones = [];
        this.leftFoodPheromones = [];
        this.rightFoodPheromones = [];
        this.food = [];

        this.state = "FIND_FOOD";
        this.pheromoneTimer = this.config.homePheromoneFrequency;
        this.timer = 0;
    }

    canSee(target, distanceSquared_) {
        if (distanceSquared(this, target) > distanceSquared_) return 0;

        const angleToTarget = Math.atan2(
            target.y - this.y,
            target.x - this.x
        );

        let angleDifference = this.angle - angleToTarget;

        if (angleDifference > Math.PI) {
            angleDifference -= 2 * Math.PI;
        } else if (angleDifference < -Math.PI) {
            angleDifference += 2 * Math.PI;
        }

        if (Math.abs(angleDifference) <= this.viewingAngleHalf)
            return angleDifference > 0 ? 1 : 2;
        return 0;
    }

    move() {
        this.angle = this.angle % (2 * Math.PI);

        if (this.angle < 0) this.angle += 2 * Math.PI;
        this.x += Math.cos(this.angle) * this.config.maxVelocity;
        this.y += Math.sin(this.angle) * this.config.maxVelocity;

        if (this.x < 0) {
            this.x = 0;
            this.angle = Math.PI - this.angle;
        } else if (this.x > this.config.width) {
            this.x = this.config.width;
            this.angle = Math.PI - this.angle;
        }

        if (this.y < 0) {
            this.y = 0;
            this.angle = -this.angle;
        } else if (this.y > this.config.height) {
            this.y = this.config.height;
            this.angle = -this.angle;
        }
    }

    findFood() {
        if (this.pheromoneTimer >= this.config.homePheromoneFrequency) {
            this.board.createPheronome(this.x, this.y, "HOME");
            this.pheromoneTimer = 0;
        } else {
            this.pheromoneTimer++;
        }

        for (const food of this.food) {
            if (distanceSquared(this, food) < 1600) {
                food.taken = true;
                this.angle = this.angle + Math.PI;
                this.state = "FOUND_FOOD";
                this.timer = 0;
                this.pheromoneTimer = this.config.foodPheromoneFrequency;
                return;
            }
        }

        if (this.leftFoodPheromones.length > this.rightFoodPheromones.length) {
            this.angle -= degreeToRadians(10);
        } else if (this.leftFoodPheromones.length < this.rightFoodPheromones.length) {
            this.angle += degreeToRadians(10);
        }
    }

    foundFood() {
            if (this.pheromoneTimer >= this.config.foodPheromoneFrequency) {
                this.board.createPheronome(this.x, this.y, "FOOD");
                this.pheromoneTimer = 0;
            } else {
                this.pheromoneTimer++;
            }

        if (distanceSquared(this, {
            x: this.config.width / 5, y: this.config.height / 5
        }) < 1600) {
            this.angle = this.angle + Math.PI;
            this.state = "FIND_FOOD";
            this.timer = 0;
            this.pheromoneTimer = this.config.homePheromoneFrequency;
        }

        if (this.leftHomePheromones.length > this.rightHomePheromones.length) {
            this.angle -= degreeToRadians(10);
        } else if (this.leftHomePheromones.length < this.rightHomePheromones.length) {
            this.angle += degreeToRadians(10);
        }
    }

    update() {
        if (this.state === "FIND_FOOD") {
            this.findFood();
        } else if (this.state === "FOUND_FOOD") {
            this.foundFood();
        }
    }
}

class Pheromone {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.age = 0;
    }

    update() {
        this.age += 1;
    }
}

class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.taken = false;
    }
}

class Board {
    constructor(canvasId, antsCount, config) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d", { alpha: false });
        this.config = config;
        this.ants = [];
        this.homePheromones = [];
        this.foodPheromones = [];
        this.food = [];
        this.resizeCanvas();
        this.initializeAnts(antsCount);
        this.skipFrameTimer = this.config.skipFrames;

        this.spawnFood(this.config.width / 5 * 4, this.config.height / 5 * 4, 100);
        this.spawnFood(this.config.width / 5, this.config.height / 5 * 4, 10);
        this.spawnFood(this.config.width / 5 * 4, this.config.height / 5, 50);

        window.addEventListener("resize", () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.config.width = window.innerWidth;
        this.config.height = window.innerHeight;
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
    }

    initializeAnts(antsCount) {
        for (let i = 0; i < antsCount; i++) {
            this.ants.push(
                new Ant(
                    this.config.width / 5,
                    this.config.height / 5,
                    this.config,
                    this
                )
            );
        }
    }

    spawnFood(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.food.push(
                new Food(
                    x + randomInclusiveInt(-20, 20),
                    y + randomInclusiveInt(-20, 20)
                )
            );
        }
    }

    updateSurroundings() {
        for (const ant of this.ants) {
            ant.leftHomePheromones.length = 0;
            ant.rightHomePheromones.length = 0;
            ant.leftFoodPheromones.length = 0;
            ant.rightFoodPheromones.length = 0;
            ant.food.length = 0;

            for (const pheromone of this.homePheromones) {
                const canSee = ant.canSee(pheromone, this.config.homePheromoneDistanceSquared)
                if (canSee === 1) {
                    ant.leftHomePheromones.push(pheromone);
                } else if (canSee === 2) {
                    ant.rightHomePheromones.push(pheromone);
                }
            }

            for (const pheromone of this.foodPheromones) {
                const canSee = ant.canSee(pheromone, this.config.foodPheromoneDistanceSquared)
                if (canSee === 1) {
                    ant.leftFoodPheromones.push(pheromone);
                } else if (canSee === 2) {
                    ant.rightFoodPheromones.push(pheromone);
                }
            }

            for (const food of this.food) {
                if (ant.canSee(food, this.config.foodPheromoneDistanceSquared)) {
                    ant.food.push(food);
                }
            }
        }
    }

    draw() {
        this.ctx.fillStyle = `rgba(255,255,255,${1-this.config.trail})`;
        this.ctx.fillRect(0, 0, this.config.width, this.config.height);

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(this.config.width / 5 - 20, this.config.height / 5 - 20, 40, 40);

        this.ctx.lineWidth = 1;

        if (this.config.showTrail) {
            this.ctx.fillStyle = "green";
            for (const pheromone of this.homePheromones)
                this.ctx.fillRect(pheromone.x, pheromone.y, 1, 1);

            this.ctx.fillStyle = "magenta";
            for (const pheromone of this.foodPheromones)
                this.ctx.fillRect(pheromone.x, pheromone.y, 1, 1);
        }

        this.ctx.fillStyle = "pink";
        for (const food of this.food)
            this.ctx.fillRect(food.x - 5, food.y - 5, 10, 10);

        for (const ant of this.ants) {
            if (ant.state === "FIND_FOOD") {
                this.ctx.fillStyle = "red";
                this.ctx.strokeStyle = "blue";
            } else if (ant.state === "FOUND_FOOD") {
                this.ctx.fillStyle = "pink";
                this.ctx.strokeStyle = "blue";
            }

            this.ctx.fillRect(ant.x - 2, ant.y - 2, 4, 4);
            this.ctx.beginPath();
            this.ctx.moveTo(ant.x, ant.y);
            this.ctx.lineTo(ant.x + Math.cos(ant.angle) * this.config.lineMultiplier, ant.y + Math.sin(ant.angle) * this.config.lineMultiplier);
            this.ctx.stroke();
        }
    }

    update() {
        this.createPheronome(this.config.width / 5, this.config.height / 5, "HOME");

        this.updateSurroundings();

        for (const ant of this.ants) ant.update();
        for (const ant of this.ants) ant.move();

        this.homePheromones = this.homePheromones.filter(p => {
            p.update();
            return p.age <= this.config.homePheromoneLifespan;
        });
        this.foodPheromones = this.foodPheromones.filter(p => {
            p.update();
            return p.age <= this.config.foodPheromoneLifespan;
        });
        this.food = this.food.filter(food => !(food.taken));

        if (this.skipFrameTimer >= this.config.skipFrames) {
            this.draw();
            this.skipFrameTimer = 0;
        } else {
            this.skipFrameTimer++;
        }
    }

    createPheronome(x, y, type) {
        x += randomInclusiveInt(-5, 5);
        y += randomInclusiveInt(-5, 5);
        if (type === "HOME") {
            this.homePheromones.push(new Pheromone(x, y));
        } else if (type === "FOOD") {
            this.foodPheromones.push(new Pheromone(x, y));
        }
    }
}

const defaultConfig = {
    homePheromoneDistanceSquared: HOME_PHEROMONE_DISTANCE_SQUARED,
    homePheromonePower: HOME_PHEROMONE_POWER,
    homePheromoneFrequency: HOME_PHEROMONE_FREQUENCY,
    homePheromoneLifespan: HOME_PHEROMONE_LIFESPAN,
    foodPheromoneDistanceSquared: FOOD_PHEROMONE_DISTANCE_SQUARED,
    foodPheromonePower: FOOD_PHEROMONE_POWER,
    foodPheromoneFrequency: FOOD_PHEROMONE_FREQUENCY,
    foodPheromoneLifespan: FOOD_PHEROMONE_LIFESPAN,
    antDistanceSquared: ANT_DISTANCE_SQUARED,
    antPower: ANT_POWER,
    maxVelocity: MAX_VELOCITY,
    maxAcceleration: MAX_ACCELERATION,
    lineMultiplier: LINE_MULTIPLIER,
    trail: TRAIL,
    showTrail: false,
    skipFrames: 0
}
let board = new Board("canvas", ANTS, defaultConfig);

addRangeListener("homePheromoneDistance", defaultConfig, Math.sqrt(HOME_PHEROMONE_DISTANCE_SQUARED));
addRangeListener("homePheromonePower", defaultConfig, HOME_PHEROMONE_POWER);
addRangeListener("homePheromoneFrequency", defaultConfig, HOME_PHEROMONE_FREQUENCY);
addRangeListener("homePheromoneLifespan", defaultConfig, HOME_PHEROMONE_LIFESPAN);
addRangeListener("foodPheromoneDistance", defaultConfig, Math.sqrt(FOOD_PHEROMONE_DISTANCE_SQUARED));
addRangeListener("foodPheromonePower", defaultConfig, FOOD_PHEROMONE_POWER);
addRangeListener("foodPheromoneFrequency", defaultConfig, FOOD_PHEROMONE_FREQUENCY);
addRangeListener("foodPheromoneLifespan", defaultConfig, FOOD_PHEROMONE_LIFESPAN);
addRangeListener("antDistance", defaultConfig, Math.sqrt(ANT_DISTANCE_SQUARED));
addRangeListener("antPower", defaultConfig, ANT_POWER);
addRangeListener("maxVelocity", defaultConfig, MAX_VELOCITY);
addRangeListener("maxAcceleration", defaultConfig, MAX_ACCELERATION);
addRangeListener("lineMultiplier", defaultConfig, LINE_MULTIPLIER);
addRangeListener("trail", defaultConfig, TRAIL);
addRangeListener("skipFrames", defaultConfig, 0);

let running = true;
const toggleButton = document.getElementById("toggle");
toggleButton.addEventListener("click", () => {
    if (running) {
        toggleButton.value = "Resume";
        running = false;
    } else {
        toggleButton.value = "Pause";
        running = true;
        loop();
    }
});

let ants = ANTS;
const antsInput = document.getElementById("ants")
document.getElementById("restart").addEventListener("click", () => {
    ants = antsInput.value;
    board = new Board("canvas", ants, defaultConfig);
});

const toggleTrailCheckbox = document.getElementById("toggleTrail");
toggleTrailCheckbox.addEventListener("click", () => {
    defaultConfig.showTrail = toggleTrailCheckbox.checked;
});
toggleTrailCheckbox.dispatchEvent(new Event("click"));

const performanceSpan = document.getElementById("performance");
let updateStart;
let udpateTime;
let frameCount = 0;
let lastTime = performance.now();
let now;
let fps = 0;

function loop() {
    updateStart = performance.now();
    board.update();
    updateTime = performance.now() - updateStart;

    frameCount++;
    now = performance.now();
    if (now - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
    }

    performanceSpan.textContent = `FPS: ${fps}, Update: ${updateTime.toFixed(3)}ms`;

    if (running) requestAnimationFrame(loop);
}

loop();
