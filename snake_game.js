class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.lifetime = 30;
        this.color = `rgb(${Math.random() * 105 + 150}, ${Math.random() * 105 + 150}, ${Math.random() * 105 + 150})`;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.lifetime--;
        return this.lifetime > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.lifetime / 30;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.restore();
    }
}

class Snake {
    constructor(gridWidth, gridHeight) {
        this.body = [{x: Math.floor(gridWidth/2), y: Math.floor(gridHeight/2)}];
        this.direction = {x: 1, y: 0};
        this.grow = false;
        this.particles = [];
        this.hue = 0;
    }

    update(gridWidth, gridHeight, gridSize) {
        const newHead = {
            x: (this.body[0].x + this.direction.x + gridWidth) % gridWidth,
            y: (this.body[0].y + this.direction.y + gridHeight) % gridHeight
        };

        this.body.unshift(newHead);
        if (!this.grow) {
            this.body.pop();
        } else {
            this.grow = false;
            const x = newHead.x * gridSize;
            const y = newHead.y * gridSize;
            for (let i = 0; i < 10; i++) {
                this.particles.push(new Particle(x, y));
            }
        }

        this.particles = this.particles.filter(p => p.update());
        this.hue = (this.hue + 0.01) % 1;
    }

    draw(ctx, gridSize) {
        this.particles.forEach(p => p.draw(ctx));

        this.body.forEach((segment, i) => {
            const hue = (this.hue + i * 0.02) % 1;
            ctx.fillStyle = `hsl(${hue * 360}, 100%, 50%)`;
            ctx.beginPath();
            ctx.roundRect(
                segment.x * gridSize,
                segment.y * gridSize,
                gridSize - 2,
                gridSize - 2,
                8
            );
            ctx.fill();
        });
    }

    setDirection(dir) {
        if (this.direction.x === -dir.x && this.direction.y === -dir.y) return;
        this.direction = dir;
    }
}

class Food {
    constructor(gridWidth, gridHeight) {
        this.position = this.randomPosition(gridWidth, gridHeight);
        this.color = 'rgb(255, 50, 50)';
        this.glow = 0;
        this.glowDirection = 1;
    }

    randomPosition(gridWidth, gridHeight) {
        return {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
    }

    draw(ctx, gridSize) {
        this.glow += 0.1 * this.glowDirection;
        if (this.glow >= 1) this.glowDirection = -1;
        else if (this.glow <= 0) this.glowDirection = 1;

        const radius = gridSize/2 + this.glow * 5;
        const x = this.position.x * gridSize + gridSize/2;
        const y = this.position.y * gridSize + gridSize/2;

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.2;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, gridSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.resize();

        this.snake = new Snake(this.gridWidth, this.gridHeight);
        this.food = new Food(this.gridWidth, this.gridHeight);
        this.gameOver = false;

        this.setupControls();
        window.addEventListener('resize', () => this.resize());
        this.lastTime = 0;
        this.accumulator = 0;
        this.timeStep = 100; // 控制游戏速度

        requestAnimationFrame(time => this.gameLoop(time));
    }

    resize() {
        const maxWidth = Math.min(800, window.innerWidth - 20);
        const maxHeight = Math.min(600, window.innerHeight - 100);
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        this.gridWidth = Math.floor(maxWidth / this.gridSize);
        this.gridHeight = Math.floor(maxHeight / this.gridSize);
    }

    setupControls() {
        const directions = {
            'ArrowUp': {x: 0, y: -1},
            'ArrowDown': {x: 0, y: 1},
            'ArrowLeft': {x: -1, y: 0},
            'ArrowRight': {x: 1, y: 0}
        };

        document.addEventListener('keydown', e => {
            if (this.gameOver && e.code === 'Space') {
                this.restart();
                return;
            }
            if (directions[e.code]) {
                this.snake.setDirection(directions[e.code]);
            }
        });

        // 移动设备控制
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('up')) this.snake.setDirection(directions['ArrowUp']);
                if (btn.classList.contains('down')) this.snake.setDirection(directions['ArrowDown']);
                if (btn.classList.contains('left')) this.snake.setDirection(directions['ArrowLeft']);
                if (btn.classList.contains('right')) this.snake.setDirection(directions['ArrowRight']);
            });
        });
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'hsla(240, 100%, 5%, 1)');
        gradient.addColorStop(1, 'hsla(200, 100%, 5%, 1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    checkCollision() {
        const head = this.snake.body[0];
        // 检查是否吃到食物
        if (head.x === this.food.position.x && head.y === this.food.position.y) {
            this.snake.grow = true;
            do {
                this.food.position = this.food.randomPosition(this.gridWidth, this.gridHeight);
            } while (this.snake.body.some(segment => 
                segment.x === this.food.position.x && segment.y === this.food.position.y
            ));
        }

        // 检查是否撞到自己
        for (let i = 1; i < this.snake.body.length; i++) {
            if (head.x === this.snake.body[i].x && head.y === this.snake.body[i].y) {
                this.gameOver = true;
                break;
            }
        }
    }

    drawGameOver() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束!', this.canvas.width/2, this.canvas.height/2);

        this.ctx.font = '24px Arial';
        this.ctx.fillText('按空格键重新开始', this.canvas.width/2, this.canvas.height/2 + 40);
        this.ctx.restore();
    }

    restart() {
        this.snake = new Snake(this.gridWidth, this.gridHeight);
        this.food = new Food(this.gridWidth, this.gridHeight);
        this.gameOver = false;
    }

    gameLoop(currentTime) {
        if (this.lastTime) {
            const deltaTime = currentTime - this.lastTime;
            this.accumulator += deltaTime;

            while (this.accumulator >= this.timeStep) {
                if (!this.gameOver) {
                    this.snake.update(this.gridWidth, this.gridHeight, this.gridSize);
                    this.checkCollision();
                }
                this.accumulator -= this.timeStep;
            }
        }
        this.lastTime = currentTime;

        this.drawBackground();
        this.food.draw(this.ctx, this.gridSize);
        this.snake.draw(this.ctx, this.gridSize);

        if (this.gameOver) {
            this.drawGameOver();
        }

        requestAnimationFrame(time => this.gameLoop(time));
    }
}

// 当页面加载完成后启动游戏
window.addEventListener('load', () => {
    new Game();
});