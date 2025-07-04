const plinkoGame = {
    view: document.getElementById('plinkoGameView'),
    initialized: false, canvas: null, ctx: null, betBtn: null,
    pegs: [], balls: [], isAnimating: false, animationFrameId: null,
    historyContainer: null,
    pegHitEffects: [],
    PEG_ROWS: 16, PEG_RADIUS: 4, BALL_RADIUS: 7, PEG_COLOR: '#475569',
    MULTIPLIERS: [110, 27, 8, 4, 2, 1, 0.5, 0.2, 0.2, 0.2, 0.5, 1, 2, 4, 8, 27, 110],
    BALL_COLORS: ['#f8fafc', '#f472b6', '#60a5fa', '#facc15', '#4ade80'],

    init() {
        this.initialized = true;
        this.canvas = this.view.querySelector('.plinko-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.betBtn = this.view.querySelector('.plinkoBetBtn');
        this.multipliersContainer = this.view.querySelector('.plinko-multipliers-container');
        this.historyContainer = document.getElementById('plinkoHistory');
        this.start();
    },

    start() {
        this.resizeCanvas();
        this.setupMultipliers();
        this.setupPegs();
        this.draw();
        this.historyContainer.innerHTML = '';
        updateAllBalances();
        updateBetControls();
    },

    stop() {
         if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.isAnimating = false;
        }
    },

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 16;
        this.canvas.width = containerWidth;
        this.canvas.height = containerWidth;
    },

    getMultiplierClass(m) {
        if (m >= 110) return 'color-7';
        if (m >= 27) return 'color-6';
        if (m >= 8) return 'color-5';
        if (m >= 2) return 'color-4';
        if (m >= 1) return 'color-3';
        if (m >= 0.5) return 'color-2';
        return 'color-1';
    },

    setupPegs() {
        this.pegs = [];
        const hSpacing = this.canvas.width / (this.PEG_ROWS + 2);
        const vSpacing = (this.canvas.height - 50) / (this.PEG_ROWS + 1);
        for (let row = 0; row < this.PEG_ROWS; row++) {
            const numPegs = row + 2;
            const rowWidth = (numPegs - 1) * hSpacing;
            const startX = (this.canvas.width - rowWidth) / 2;
            for (let col = 0; col < numPegs; col++) {
                this.pegs.push({ x: startX + col * hSpacing, y: vSpacing * (row + 1.5) });
            }
        }
    },
    
    setupMultipliers() {
        this.multipliersContainer.innerHTML = '';
        const bucketWidth = this.canvas.width / this.MULTIPLIERS.length;
        this.MULTIPLIERS.forEach((m, i) => {
            const el = document.createElement('div');
            el.textContent = `${m}x`;
            el.className = 'multiplier-box rounded font-bold flex items-center justify-center';
            el.classList.add(this.getMultiplierClass(m));
            el.style.width = `${bucketWidth - 2}px`;
            el.style.height = `30px`;
            el.id = `plinko-multiplier-${i}`;
            this.multipliersContainer.appendChild(el);
        });
    },
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = this.PEG_COLOR;
        this.pegs.forEach(peg => {
            this.ctx.beginPath();
            this.ctx.arc(peg.x, peg.y, this.PEG_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
        });
    },
    
    updateBetButtonState() {
        this.betBtn.disabled = balance < betAmount || betAmount <= 0;
    },
    
    placeBet() {
        if (betAmount <= 0) { showMessage('베팅 금액은 0보다 커야 합니다.'); return; }
        if (betAmount > balance) { showMessage('잔액이 부족합니다.'); return; }
        balance -= betAmount; 
        updateAllBalances();
        updateBetControls();

        const newBall = {
            x: this.canvas.width / 2 + (Math.random() - 0.5) * 10, y: this.BALL_RADIUS,
            vx: (Math.random() - 0.5) * 0.5, vy: 0, bet: betAmount,
            color: this.BALL_COLORS[Math.floor(Math.random() * this.BALL_COLORS.length)], settled: false,
        };
        this.balls.push(newBall);
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.animate();
        }
    },

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw();

        for (let i = this.balls.length - 1; i >= 0; i--) {
            let ball = this.balls[i];
            ball.vy += 0.65; ball.x += ball.vx; ball.y += ball.vy;
            if (ball.x - this.BALL_RADIUS < 0 || ball.x + this.BALL_RADIUS > this.canvas.width) {
                ball.vx *= -0.6;
                ball.x = Math.max(this.BALL_RADIUS, Math.min(this.canvas.width - this.BALL_RADIUS, ball.x));
            }
            if (!ball.settled) {
                for (const peg of this.pegs) {
                    const dx = ball.x - peg.x, dy = ball.y - peg.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.BALL_RADIUS + this.PEG_RADIUS) {
                        const angle = Math.atan2(dy, dx);
                        const normalX = dx / dist, normalY = dy / dist;
                        const dot = ball.vx * normalX + ball.vy * normalY;
                        
                        const bounceFactor = 0.45;
                        const randomXPush = (Math.random() - 0.5) * 0.15;
                        const centerPull = (this.canvas.width / 2 - ball.x) * 0.0045; 
                        
                        ball.vx = (ball.vx - 2 * dot * normalX) * bounceFactor + randomXPush + centerPull;
                        ball.vy = (ball.vy - 2 * dot * normalY) * 0.4;
                        
                        this.pegHitEffects.push({ x: peg.x, y: peg.y, radius: this.PEG_RADIUS * 1.5, opacity: 0.8 });

                        const overlap = this.BALL_RADIUS + this.PEG_RADIUS - dist;
                        ball.x += Math.cos(angle) * overlap;
                        ball.y += Math.sin(angle) * overlap;
                        break;
                    }
                }
            }
            this.ctx.fillStyle = ball.color;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, this.BALL_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
            if (!ball.settled && ball.y + this.BALL_RADIUS > this.canvas.height - 30) this.endGame(ball);
            if (ball.y - this.BALL_RADIUS > this.canvas.height) this.balls.splice(i, 1);
        }

        for (let j = this.pegHitEffects.length - 1; j >= 0; j--) {
            const effect = this.pegHitEffects[j];
            effect.opacity -= 0.08;

            if (effect.opacity <= 0) {
                this.pegHitEffects.splice(j, 1);
                continue;
            }
            this.ctx.beginPath();
            this.ctx.globalAlpha = effect.opacity;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }

        if (this.balls.length === 0) {
            this.isAnimating = false;
            cancelAnimationFrame(this.animationFrameId);
        }
    },
    
    endGame(ball) {
        ball.settled = true;
        const bucketWidth = this.canvas.width / this.MULTIPLIERS.length;
        let bucketIndex = Math.floor(ball.x / bucketWidth);
        bucketIndex = Math.max(0, Math.min(this.MULTIPLIERS.length - 1, bucketIndex));
        const multiplier = this.MULTIPLIERS[bucketIndex];
        const winnings = ball.bet * multiplier;
        balance += winnings;
        updateAllBalances();
        updateBetControls();

        this.drawHitHistory(multiplier);

        const hitEl = this.view.querySelector(`#plinko-multiplier-${bucketIndex}`);
        if (hitEl) {
            hitEl.classList.add('hit', 'hit-animation');
            setTimeout(() => hitEl.classList.remove('hit', 'hit-animation'), 500);
        }
    },

    drawHitHistory(multiplier) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.classList.add(this.getMultiplierClass(multiplier));
        item.textContent = `${multiplier}x`;
        
        this.historyContainer.prepend(item);

        if (this.historyContainer.children.length > 7) {
            this.historyContainer.lastChild.remove();
        }

        setTimeout(() => {
            item.classList.add('hidden');
            setTimeout(() => item.remove(), 800);
        }, 2200);
    }
};