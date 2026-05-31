const ANTS = 1;
const HOME_PHEROMONE_DISTANCE_SQUARED = 200 ** 2;
const HOME_PHEROMONE_POWER       = 1;
const HOME_PHEROMONE_FREQUENCY   = 10;
const HOME_PHEROMONE_LIFESPAN    = 800;
const FOOD_PHEROMONE_DISTANCE_SQUARED = 200 ** 2;
const FOOD_PHEROMONE_POWER       = 1;
const FOOD_PHEROMONE_FREQUENCY   = 10;
const FOOD_PHEROMONE_LIFESPAN    = 1600;
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

function normal(x, y) {
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const magnitude = Math.sqrt(x*x + y*y);
    return { x: x / magnitude, y: y / magnitude };
}

function randomInclusiveInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Ant {
    constructor(x, y, config, board) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.board = board
        this.state = "SCOUT";
        this.pheromoneTimer = this.config.homePheromoneFrequency;
        this.timer = 0;
        this.px = -1;
        this.py = -1;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.config.maxVelocity;
        this.vy = Math.sin(angle) * this.config.maxVelocity;
        this.ax = 0;
        this.ay = 0;
        this.homePheromones = [];
        this.foodPheromones = [];
        this.ants = [];
        this.food = [];
    }

    move() {
        if (this.ax === 0 && this.ay === 0) {
            this.ax = this.vx;
            this.ay = this.vy;
        }
        const accMagnitude = Math.sqrt(this.ax * this.ax + this.ay * this.ay);
        if (accMagnitude > this.config.maxAcceleration) {
            this.ax = (this.ax / accMagnitude) * this.config.maxAcceleration;
            this.ay = (this.ay / accMagnitude) * this.config.maxAcceleration;
        }

        this.vx += this.ax;
        this.vy += this.ay;

        const velMagnitude = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (velMagnitude > this.config.maxVelocity) {
            this.vx = (this.vx / velMagnitude) * this.config.maxVelocity;
            this.vy = (this.vy / velMagnitude) * this.config.maxVelocity;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) {
            this.x = 0;
            this.vx *= -1;
        } else if (this.x > this.config.width) {
            this.x = this.config.width;
            this.vx *= -1;
        }

        if (this.y < 0) {
            this.y = 0;
            this.vy *= -1;
        } else if (this.y > this.config.height) {
            this.y = this.config.height;
            this.vy *= -1;
        }

        this.ax = 0;
        this.ay = 0;
    }

    scout() {
        if (this.pheromoneTimer >= this.config.homePheromoneFrequency) {
            this.board.createPheronome(this.x, this.y, this.px, this.py, "HOME");
            this.pheromoneTimer = 0;
            this.px = this.x;
            this.py = this.y;
        } else {
            this.pheromoneTimer++;
        }

        if (this.timer >= 400) {
            this.state = "HOME";
            this.timer = 0;
        } else {
            this.timer++;
        }

        if (distanceSquared(this, {
            x: this.config.width / 5 * 4, y: this.config.height / 5 * 4
        }) < 1600) {
            this.state = "FOOD";
            this.timer = 0;
            this.pheromoneTimer = this.config.foodPheromoneFrequency;
            this.px = -1;
            this.py = -1;
        }

        if (this.foodPheromones.length === 0) return;

        let oldest = this.foodPheromones[0];
        let x;
        let y;

        for (const pheromone of this.foodPheromones) oldest = pheromone.age > oldest.age ? pheromone : oldest;

        ({ x, y } = normal(
            oldest.x - this.x,
            oldest.y - this.y
        ));

        this.ax += x * this.config.foodPheromonePower;
        this.ay += y * this.config.foodPheromonePower;
    }

    home() {
        if (this.state === "FOOD") {
            if (this.pheromoneTimer >= this.config.foodPheromoneFrequency) {
                this.board.createPheronome(this.x, this.y, this.px, this.py, "FOOD");
                this.pheromoneTimer = 0;
                this.px = this.x;
                this.py = this.y;
            } else {
                this.pheromoneTimer++;
            }
        }

        if (distanceSquared(this, {
            x: this.config.width / 5, y: this.config.height / 5
        }) < 1600) {
            this.state = "SCOUT";
            this.timer = 0;
            this.pheromoneTimer = this.config.homePheromoneFrequency;
            this.px = -1;
            this.py = -1;
        }

        if (this.homePheromones.length === 0) return;

        let oldest = this.homePheromones[0];
        let x;
        let y;

        for (const pheromone of this.homePheromones) oldest = pheromone.age > oldest.age ? pheromone : oldest;

        ({ x, y } = normal(
            oldest.x - this.x,
            oldest.y - this.y
        ));

        this.ax += x * this.config.homePheromonePower;
        this.ay += y * this.config.homePheromonePower;
    }

    avoidAnts() {
        if (this.ants.length === 0) return;

        let sumX = 0;
        let sumY = 0;
        let x;
        let y;

        for (const ant of this.ants) {
            sumX += ant.x;
            sumY += ant.y;
        }

        ({ x, y } = normal(
            this.x - sumX / this.ants.length,
            this.y - sumY / this.ants.length,
        ))

        this.ax += x * this.config.antPower;
        this.ay += y * this.config.antPower;
    }

    update() {
        if (this.state === "SCOUT") {
            this.scout();
        } else if (this.state === "HOME" || this.state === "FOOD") {
            this.home();
        }
        this.avoidAnts();
    }
}

class Pheromone {
    constructor(x, y, px, py) {
        this.x = x;
        this.y = y;
        this.px = px;
        this.py = py;
        this.age = 0;
    }

    update() {
        this.age += 1;
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

    updateSurroundings() {
        for (const ant of this.ants) ant.ants.length = 0;

        for (const ant of this.ants) {
            ant.homePheromones.length = 0;
            ant.foodPheromones.length = 0;
            ant.food.length = 0;

            for (const pheromone of this.homePheromones) {
                if (distanceSquared(ant, pheromone) < this.config.homePheromoneDistanceSquared) {
                    ant.homePheromones.push(pheromone);
                }
            }

            for (const pheromone of this.foodPheromones) {
                if (distanceSquared(ant, pheromone) < this.config.foodPheromoneDistanceSquared) {
                    ant.foodPheromones.push(pheromone);
                }
            }

            for (const otherAnt of this.ants) {
                if (distanceSquared(ant, otherAnt) < this.config.antDistanceSquared) {
                    ant.ants.push(otherAnt);
                    otherAnt.ants.push(ant);
                }
            }

            for (const food of this.food) {
                if (distanceSquared(ant, food) < this.config.foodDistanceSquared) {
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

        this.ctx.fillStyle = "pink";
        this.ctx.fillRect(this.config.width / 5 * 4 - 20, this.config.height / 5 * 4 - 20, 40, 40);

        this.ctx.lineWidth = 1;

        if (this.config.showTrail) {
            this.ctx.strokeStyle = "green";
            for (const pheromone of this.homePheromones) {
                this.ctx.beginPath();
                this.ctx.moveTo(pheromone.x, pheromone.y);
                this.ctx.lineTo(pheromone.px, pheromone.py);
                this.ctx.stroke();
            }

            this.ctx.strokeStyle = "magenta";
            for (const pheromone of this.foodPheromones) {
                this.ctx.beginPath();
                this.ctx.moveTo(pheromone.x, pheromone.y);
                this.ctx.lineTo(pheromone.px, pheromone.py);
                this.ctx.stroke();
            }
        }

        for (const ant of this.ants) {
            if (ant.state === "SCOUT") {
                this.ctx.fillStyle = "red";
                this.ctx.strokeStyle = "blue";
            } else if (ant.state === "HOME") {
                this.ctx.fillStyle = "blue";
                this.ctx.strokeStyle = "red";
            } else if (ant.state === "FOOD") {
                this.ctx.fillStyle = "pink";
                this.ctx.strokeStyle = "blue";
            }

            this.ctx.fillRect(ant.x - 2, ant.y - 2, 4, 4);
            this.ctx.beginPath();
            this.ctx.moveTo(ant.x, ant.y);
            this.ctx.lineTo(ant.x + ant.vx * this.config.lineMultiplier, ant.y + ant.vy * this.config.lineMultiplier);
            this.ctx.stroke();
        }
    }

    update() {
        this.updateSurroundings();

        for (const ant of this.ants) ant.update();
        for (const ant of this.ants) ant.move(this.config.width, this.config.height);

        this.homePheromones = this.homePheromones.filter(p => {
            p.update();
            return p.age <= this.config.homePheromoneLifespan;
        });
        this.foodPheromones = this.foodPheromones.filter(p => {
            p.update();
            return p.age <= this.config.foodPheromoneLifespan;
        });

        if (this.skipFrameTimer >= this.config.skipFrames) {
            this.draw();
            this.skipFrameTimer = 0;
        } else {
            this.skipFrameTimer++;
        }
    }

    createPheronome(x, y, px, py, type) {
        if (px === -1) {
            px = x;
            py = y;
        }
        if (type === "HOME") {
            this.homePheromones.push(new Pheromone(x, y, px, py));
        } else if (type === "FOOD") {
            this.foodPheromones.push(new Pheromone(x, y, px, py));
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
