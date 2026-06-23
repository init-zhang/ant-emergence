const ANTS = 50;
const HOME_PHEROMONE_DISTANCE_SQUARED = 200 ** 2;
const HOME_PHEROMONE_FREQUENCY   = 10;
const HOME_PHEROMONE_LIFESPAN    = 400;
const FOOD_PHEROMONE_DISTANCE_SQUARED = 200 ** 2;
const FOOD_PHEROMONE_FREQUENCY   = 10;
const FOOD_PHEROMONE_LIFESPAN    = 400;
const PHEROMONE_GRID_SIZE = 200;
const MAX_VELOCITY     = 3;
const LINE_MULTIPLIER = 5;
const TRAIL = 0.4;

function distanceSquared(u, v) {
    const dx = u.x - v.x;
    const dy = u.y - v.y;
    return dx * dx + dy * dy;
}

function withinRect(x, y, top, bottom, left, right) {
    return (left < x && x < right && top < y && y < bottom)
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

        // All angles in radians.
        // 0 radian points east, going north increases radian.
        this.angle = Math.random() * Math.PI * 2;
        this.viewingAngleHalf = degreeToRadians(45);
        this.turningAngle = degreeToRadians(1);
        this.turningRandomness = degreeToRadians(5);

        this.leftHomePheromones = [];
        this.rightHomePheromones = [];
        this.leftFoodPheromones = [];
        this.rightFoodPheromones = [];
        this.food = [];

        this.state = "FIND_FOOD";
        this.pheromoneTimer = this.config.homePheromoneFrequency;
    }

    canSee(target, distanceSquared_) {
        if (distanceSquared(this, target) > distanceSquared_) return 0;

        const angleToTarget = Math.atan2(
            target.y - this.y,
            target.x - this.x
        );

        let angleDifference = this.angle - angleToTarget;

        // Clamp within -/+ PI for correct angle wraparound.
        if (angleDifference > Math.PI) {
            angleDifference -= 2 * Math.PI;
        } else if (angleDifference < -Math.PI) {
            angleDifference += 2 * Math.PI;
        }

        // Return 1 if target is left of angle, 2 if right.
        if (Math.abs(angleDifference) <= this.viewingAngleHalf)
            // With an example ant angle of 0 radian, a target to the left
            // would have a greater radian whilst a target to the right would
            // have a lesser radian.
            // 0 - greater radian would result in a negative difference.
            // 0 - lesser radian would result in a positive difference.
            return angleDifference < 0 ? 1 : 2;
        return 0;
    }

    turn() {
        return (
            this.turningAngle
            + Math.random() * 2 * this.turningRandomness
            - this.turningRandomness
        );
    }

    move() {
        this.angle = this.angle % (2 * Math.PI);
        if (this.angle < 0) this.angle += 2 * Math.PI;

        this.x += Math.cos(this.angle) * this.config.maxVelocity;
        this.y += Math.sin(this.angle) * this.config.maxVelocity;

        for (const wall of this.board.walls) {
            if (withinRect(this.x, this.y, wall.top, wall.bottom, wall.left, wall.right)) {
                this.x -= Math.cos(this.angle) * this.config.maxVelocity;
                this.y -= Math.sin(this.angle) * this.config.maxVelocity;

                const distToTop = Math.abs(this.y - wall.top);
                const distToBottom = Math.abs(this.y - wall.bottom);
                const distToLeft = Math.abs(this.x - wall.left);
                const distToRight = Math.abs(this.x - wall.right);

                const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);

                if (minDist === distToTop || minDist === distToBottom) {
                    this.angle = -this.angle;
                } else {
                    this.angle = Math.PI - this.angle;
                }
                this.angle += + Math.random() * 2 * this.turningRandomness - this.turningRandomness

                this.angle = this.angle % (2 * Math.PI);
                if (this.angle < 0) this.angle += 2 * Math.PI;
            }
        }

        if (this.x < 0) {
            this.x = 0;
            this.angle = Math.random() * Math.PI * 2;
        } else if (this.x > this.config.width) {
            this.x = this.config.width;
            this.angle = Math.random() * Math.PI * 2;
        }

        if (this.y < 0) {
            this.y = 0;
            this.angle = Math.random() * Math.PI * 2;
        } else if (this.y > this.config.height) {
            this.y = this.config.height;
            this.angle = Math.random() * Math.PI * 2;
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
                this.pheromoneTimer = this.config.foodPheromoneFrequency;
                return;
            }

            const canSeeFood = this.canSee(food, this.foodPheromoneDistanceSquared);

            if (canSeeFood === 1) {
                this.angle += this.turn();
                return;
            } else if (canSeeFood === 2) {
                this.angle -= this.turn();
                return;
            }
        }

        if (this.leftFoodPheromones.length > this.rightFoodPheromones.length) {
            this.angle += this.turn();
        } else if (this.leftFoodPheromones.length < this.rightFoodPheromones.length) {
            this.angle -= this.turn();
        }
    }

    foundFood() {
        if (this.pheromoneTimer >= this.config.foodPheromoneFrequency) {
            this.board.createPheronome(this.x, this.y, "FOOD");
            this.pheromoneTimer = 0;
        } else {
            this.pheromoneTimer++;
        }

        const home = { x: this.config.width / 5, y: this.config.height / 5 }

        if (distanceSquared(this, home) < 1600) {
            this.angle = this.angle + Math.PI;
            this.state = "FIND_FOOD";
            this.pheromoneTimer = this.config.homePheromoneFrequency;
        }

        const canSeeHome = this.canSee(home, this.homePheromoneDistanceSquared);

        if (canSeeHome === 1) {
            this.angle += this.turn();
            return;
        } else if (canSeeHome === 2) {
            this.angle -= this.turn();
            return;
        }

        if (this.leftHomePheromones.length > this.rightHomePheromones.length) {
            this.angle += this.turn();
        } else if (this.leftHomePheromones.length < this.rightHomePheromones.length) {
            this.angle -= this.turn();
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

class Wall {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.top = this.y - height / 2;
        this.bottom = this.y + height / 2;
        this.left = this.x - width / 2;
        this.right = this.x + width / 2;
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
        this.pheromoneGrid = new Map();
        this.food = [];
        this.walls = [];
        this.resizeCanvas();
        this.initializeAnts(antsCount);

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
        this.rebuildGrid();
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

    spawnWall(x, y, width, height) {
        this.walls.push(new Wall(x, y, width, height));
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

    addPheromoneToGrid(pheromone, type) {
        const cellX = Math.floor(pheromone.x, this.config.pheromoneGridSize);
        const cellY = Math.floor(pheromone.y, this.config.pheromoneGridSize);
        const key = `${cellX},${cellY},${type}`;

        if (!this.pheromoneGrid.has(key))
            this.pheromoneGrid.set(key, []);
        this.pheromoneGrid.get(key).push(pheromone);
    }

    rebuildGrid() {
        this.pheromoneGrid.clear();

        for (const pheromone of this.homePheromones) {
            this.addPheromoneToGrid(pheromone, "HOME");
        }
        for (const pheromone of this.foodPheromones) {
            this.addPheromoneToGrid(pheromone, "FOOD");
        }}

    getNearbyPheromones(x, y, type, distanceSquared_) {
        const cellX = Math.floor(x / this.config.pheromoneGridSize);
        const cellY = Math.floor(y / this.config.pheromoneGridSize);
        const searchRadius = Math.ceil(Math.sqrt(distanceSquared_) / this.config.pheromoneGridSize) + 1;

        const nearby = [];

        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                const key = `${cellX + dx},${cellY + dy},${type}`;
                if (this.pheromoneGrid.has(key))
                    nearby.push(...this.pheromoneGrid.get(key));
            }
        }

        return nearby;
    }

    updateSurroundings() {
        for (const ant of this.ants) {
            ant.leftHomePheromones.length = 0;
            ant.rightHomePheromones.length = 0;
            ant.leftFoodPheromones.length = 0;
            ant.rightFoodPheromones.length = 0;
            ant.food.length = 0;

            const nearbyHomePheromones = this.getNearbyPheromones(
                ant.x, ant.y, "HOME",
                this.config.homePheromoneDistanceSquared
            );

            for (const pheromone of nearbyHomePheromones) {
                const canSee = ant.canSee(pheromone, this.config.homePheromoneDistanceSquared)
                if (canSee === 1) {
                    ant.leftHomePheromones.push(pheromone);
                } else if (canSee === 2) {
                    ant.rightHomePheromones.push(pheromone);
                }
            }

            const nearbyFoodPheromones = this.getNearbyPheromones(
                ant.x, ant.y, "FOOD",
                this.config.foodPheromoneDistanceSquared
            );

            for (const pheromone of nearbyFoodPheromones) {
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

    update() {
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

        this.rebuildGrid();
    }

    draw() {
        this.ctx.fillStyle = `rgba(255,255,255,${1 - this.config.trail})`;
        this.ctx.fillRect(0, 0, this.config.width, this.config.height);

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(this.config.width / 5 - 20, this.config.height / 5 - 20, 40, 40);

        this.ctx.fillStyle = "brown";
        for (const wall of this.walls)
            this.ctx.fillRect(wall.left, wall.top, wall.width, wall.height);

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
}

const defaultConfig = {
    homePheromoneDistanceSquared: HOME_PHEROMONE_DISTANCE_SQUARED,
    homePheromoneFrequency: HOME_PHEROMONE_FREQUENCY,
    homePheromoneLifespan: HOME_PHEROMONE_LIFESPAN,
    foodPheromoneDistanceSquared: FOOD_PHEROMONE_DISTANCE_SQUARED,
    foodPheromoneFrequency: FOOD_PHEROMONE_FREQUENCY,
    foodPheromoneLifespan: FOOD_PHEROMONE_LIFESPAN,
    pheromoneGridSize: PHEROMONE_GRID_SIZE,
    maxVelocity: MAX_VELOCITY,
    lineMultiplier: LINE_MULTIPLIER,
    trail: TRAIL,
    showTrail: false,
}
let board = new Board("canvas", ANTS, defaultConfig);

// Range listeners
//

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

addRangeListener("homePheromoneDistance", defaultConfig, Math.sqrt(HOME_PHEROMONE_DISTANCE_SQUARED));
addRangeListener("homePheromoneFrequency", defaultConfig, HOME_PHEROMONE_FREQUENCY);
addRangeListener("homePheromoneLifespan", defaultConfig, HOME_PHEROMONE_LIFESPAN);
addRangeListener("foodPheromoneDistance", defaultConfig, Math.sqrt(FOOD_PHEROMONE_DISTANCE_SQUARED));
addRangeListener("foodPheromoneFrequency", defaultConfig, FOOD_PHEROMONE_FREQUENCY);
addRangeListener("foodPheromoneLifespan", defaultConfig, FOOD_PHEROMONE_LIFESPAN);
addRangeListener("maxVelocity", defaultConfig, MAX_VELOCITY);
addRangeListener("lineMultiplier", defaultConfig, LINE_MULTIPLIER);
addRangeListener("trail", defaultConfig, TRAIL);

// Other config
//

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

const antsInput = document.getElementById("ants")
document.getElementById("restart").addEventListener("click", () => {
    board = new Board("canvas", antsInput.value, defaultConfig);
});

let selectedSummon = null;
const summonInputs = document.getElementById("summonInputs");
summonInputs.addEventListener("change", (event) => {
    if (event.target.type === "radio") selectedSummon = event.target.value;
});
document.getElementById("canvas").addEventListener("click", (e) => {
    if (selectedSummon === "food") {
        board.spawnFood(e.clientX, e.clientY, 10);
    } else if (selectedSummon === "wall") {
        board.spawnWall(e.clientX, e.clientY, 50, 50);
    }
    board.draw();
});

const toggleTrailCheckbox = document.getElementById("toggleTrail");
toggleTrailCheckbox.addEventListener("click", () => {
    defaultConfig.showTrail = toggleTrailCheckbox.checked;
});
toggleTrailCheckbox.dispatchEvent(new Event("click"));

const performanceSpan = document.getElementById("performance");
let updateStart;
let updateTimeSum = 0;
let updateTimeCount = 0;
let updateTime = 0;
let drawStart;
let drawTimeSum = 0;
let drawTimeCount = 0;
let drawTime = 0;
let frameCount = 0;
let lastTime = performance.now();
let now;
let fps = 0;

function loop() {
    updateStart = performance.now();
    board.update();
    updateTimeSum += performance.now() - updateStart;
    updateTimeCount++;
    drawStart = performance.now();
    board.draw();
    drawTimeSum += performance.now() - drawStart;
    drawTimeCount++;

    frameCount++;
    now = performance.now();
    if (now - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
        updateTime = updateTimeSum / updateTimeCount;
        drawTime = drawTimeSum / drawTimeCount;
        updateTimeSum = 0;
        updateTimeCount = 0;
        drawTimeSum = 0;
        drawTimeCount = 0;
    }

    performanceSpan.textContent = `FPS: ${fps}, Update: ${updateTime.toFixed(3)}ms, Draw: ${drawTime.toFixed(3)}ms`;

    if (running) requestAnimationFrame(loop);
}

loop();
