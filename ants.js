const ANTS = 1;
const HOME_DISTANCE_SQUARED = 100 ** 2;
const HOME_POWER       = 1;
const HOME_FREQUENCY   = 10;
const FOOP_DISTANCE_SQUARED = 100 ** 2;
const FOOP_POWER       = 1;
const FOOP_FREQUENCY   = 100000000;
const MAX_VELOCITY     = 5;
const MAX_ACCELERATION = 0.5;
const LINE_MULTIPLIER = 10;
const TRAIL = 0.8;

function addRangeListener(sliderID, config, defaultValue) {
    const input = document.getElementById(sliderID);
    const span = document.getElementById(sliderID + "Value");
    input.value = defaultValue;
    span.textContent = input.value;
    input.addEventListener("input", () => {
        // Specific use case for distances as they need to be squared
        if (sliderID === "homeDistance") {
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
        this.pheromoneTimer = 0;
        this.timer = 0;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.config.maxVelocity;
        this.vy = Math.sin(angle) * this.config.maxVelocity;
        this.ax = 0;
        this.ay = 0;
        this.homePheromones = [];
        this.foodPheromones = [];
        this.food = [];
    }

    move() {
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
        if (this.pheromoneTimer >= this.config.homeFrequency) {
            this.board.createPheronome(this.x, this.y, "HOME");
            this.pheromoneTimer = 0;
        } else {
            this.pheromoneTimer++;
        }

        if (this.timer >= randomInclusiveInt(500, 1000)) {
            this.state = "HOME";
            this.timer = 0;
        } else {
            this.timer++;
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

        this.ax += x * this.config.foopPower;
        this.ay += y * this.config.foopPower;
    }

    home() {
        if (this.pheromoneTimer >= this.config.foopFrequency) {
            this.board.createPheronome(this.x, this.y, "FOOD");
            this.pheromoneTimer = 0;
        } else {
            this.pheromoneTimer++;
        }

        if (distanceSquared(this, {
            x: this.config.width / 5, y: this.config.height / 5
        }) < this.config.homeDistanceSquared) {
            this.state = "SCOUT";
            this.timer = 0;
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

        this.ax += x * this.config.homePower;
        this.ay += y * this.config.homePower;
    }

    update() {
        if (this.state === "SCOUT") {
            this.scout();
        } else if (this.state === "HOME") {
            this.home();
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

class Board {
    constructor(canvasId, antsCount, config) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.config = config;
        this.ants = [];
        this.homePheromones = [];
        this.foodPheromones = [];
        this.food = [];
        this.resizeCanvas();
        this.initializeAnts(antsCount);

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
        for (const ant of this.ants) {
            ant.homePheromones.length = 0;
            ant.foodPheromones.length = 0;
            ant.food.length = 0;

            for (const pheromone of this.homePheromones) {
                if (distanceSquared(ant, pheromone) < this.config.homeDistanceSquared) {
                    ant.homePheromones.push(pheromone);
                }
            }

            for (const pheromone of this.foodPheromones) {
                if (distanceSquared(ant, pheromone) < this.config.foopDistanceSquared) {
                    ant.foodPheromones.push(pheromone);
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

        this.ctx.fillStyle = "green";
        for (const pheromone of this.homePheromones) {
            this.ctx.fillRect(pheromone.x - 2, pheromone.y - 2, 4, 4);
        }

        this.ctx.fillStyle = "magenta";
        for (const pheromone of this.foodPheromones) {
            this.ctx.fillRect(pheromone.x - 2, pheromone.y - 2, 4, 4);
        }

        this.ctx.lineWidth = 2;
        for (const ant of this.ants) {
            if (ant.state === "SCOUT") {
                this.ctx.fillStyle = "red";
                this.ctx.strokeStyle = "blue";
            } else {
                this.ctx.fillStyle = "blue";
                this.ctx.strokeStyle = "red";
            }

            this.ctx.fillRect(ant.x - 5, ant.y - 5, 10, 10);
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
            return p.age <= 800;
        });
        this.foodPheromones = this.foodPheromones.filter(p => {
            p.update();
            return p.age <= 200;
        });

        this.draw();
    }

    createPheronome(x, y, type) {
        if (type === "HOME") {
            this.homePheromones.push(new Pheromone(x, y));
        } else if (type === "FOOD") {
            this.foodPheromones.push(new Pheromone(x, y));
        }
    }
}

const defaultConfig = {
    homeDistanceSquared: HOME_DISTANCE_SQUARED,
    homePower: HOME_POWER,
    homeFrequency: HOME_FREQUENCY,
    foopDistanceSquared: FOOP_DISTANCE_SQUARED,
    foopPower: FOOP_POWER,
    foopFrequency: FOOP_FREQUENCY,
    maxVelocity: MAX_VELOCITY,
    maxAcceleration: MAX_ACCELERATION,
    lineMultiplier: LINE_MULTIPLIER,
    trail: TRAIL
}
let board = new Board("canvas", ANTS, defaultConfig);

addRangeListener("homeDistance", defaultConfig, Math.sqrt(HOME_DISTANCE_SQUARED));
addRangeListener("maxVelocity", defaultConfig, MAX_VELOCITY);
addRangeListener("maxAcceleration", defaultConfig, MAX_ACCELERATION);
addRangeListener("lineMultiplier", defaultConfig, LINE_MULTIPLIER);
addRangeListener("trail", defaultConfig, TRAIL);

let running = true;

const toggleButton = document.getElementById("toggle");
toggleButton.addEventListener("click", () => {
    if (running) {
        toggleButton.value = "Resume";
        running = false;
    } else {
        toggleButton.value = "Pause";
        running = true;
        updateLoop();
    }
});

let ants = ANTS;
const antsInput = document.getElementById("ants")
antsInput.addEventListener("input", () => {
    ants = antsInput.value;
});

document.getElementById("restart").addEventListener("click", () => {
    board = new Board("canvas", ants, defaultConfig);
});

function updateLoop() {
    board.update();
    if (running) requestAnimationFrame(() => updateLoop());
}
updateLoop();
