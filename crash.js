const crashGame = {
    view: document.getElementById('crashGameView'),
    initialized: false, canvas: null, ctx: null, multiplierDisplay: null, statusDisplay: null, betBtn: null,
    state: 'WAITING', multiplier: 1.00, startTime: 0, crashPoint: 0,
    animationFrameId: null, playerBet: null,
    VISUAL_MAX_MULTIPLIER: 30,

    init() {
        this.initialized = true;
        this.canvas = this.view.querySelector('.crash-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.multiplierDisplay = this.view.querySelector('.crash-multiplier');
        this.statusDisplay = this.view.querySelector('.crash-status');
        this.betBtn = this.view.querySelector('.crashBetBtn');
        this.start();
    },
    
    start() {
        this.resizeCanvas();
        if (this.state === 'CRASHED' || (this.state === 'WAITING' && Date.now() > this.startTime)) {
            this.reset();
        }
        this.loop();
        updateAllBalances();
        updateBetControls();
    },

    stop() {
         if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    },

    reset() {
        this.state = 'WAITING'; this.multiplier = 1.00;
        
        const r = Math.random();
        if (r < 0.5) this.crashPoint = 1 + Math.random();
        else if (r < 0.75) this.crashPoint = 2 + Math.random();
        else if (r < 0.9) this.crashPoint = 3 + Math.random() * 7;
        else if (r < 0.98) this.crashPoint = 10 + Math.random() * 10;
        else this.crashPoint = 20 + Math.random() * 10;

        this.startTime = Date.now() + 5000; this.playerBet = null;
        this.betBtn.disabled = false; this.betBtn.textContent = 'Bet';
        this.betBtn.classList.remove('bg-red-500'); this.betBtn.classList.add('btn-bet');
        this.multiplierDisplay.classList.remove('text-red-500');
        this.multiplierDisplay.classList.add('text-green-400');
        this.multiplierDisplay.textContent = '1.00x';
    },

    loop() {
        this.animationFrameId = requestAnimationFrame(() => this.loop());
        this.update();
        this.draw();
    },

    update() {
        const now = Date.now();
        if (this.state === 'WAITING') {
            const countdown = Math.max(0, (this.startTime - now) / 1000).toFixed(1);
            this.statusDisplay.textContent = `다음 라운드 시작까지: ${countdown}s`;
            if (now >= this.startTime) {
                this.state = 'RUNNING'; this.startTime = now;
                this.betBtn.disabled = this.playerBet === null;
                if(this.playerBet) {
                    this.betBtn.textContent = 'Cash Out';
                    this.betBtn.classList.add('bg-red-500');
                    this.betBtn.classList.remove('btn-bet');
                }
            }
        } else if (this.state === 'RUNNING') {
            const elapsedTime = (now - this.startTime) / 1000;
            this.multiplier = Math.exp(elapsedTime * 0.17);
            this.statusDisplay.textContent = ``;
            if (this.playerBet) this.betBtn.textContent = `Cash Out @ ${this.multiplier.toFixed(2)}x`;
            if (this.multiplier >= this.crashPoint) {
                this.state = 'CRASHED';
                if (this.playerBet) showMessage(`크래시! 베팅 금액을 잃었습니다.`);
            }
        } else if (this.state === 'CRASHED') {
            this.statusDisplay.textContent = `CRASHED @ ${this.crashPoint.toFixed(2)}x`;
            this.multiplierDisplay.textContent = `${this.crashPoint.toFixed(2)}x`;
            this.multiplierDisplay.classList.add('text-red-500');
            this.betBtn.disabled = true; this.betBtn.textContent = 'Crashed';
            this.stop();
            setTimeout(() => this.start(), 5000);
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.state === 'RUNNING' || this.state === 'CRASHED') {
            const displayMultiplier = this.state === 'CRASHED' ? this.crashPoint : this.multiplier;
            this.multiplierDisplay.textContent = `${parseFloat(displayMultiplier).toFixed(2)}x`;
            
            const visualMaxTime = (Math.log(this.VISUAL_MAX_MULTIPLIER) / 0.17);
            
            this.ctx.beginPath(); this.ctx.moveTo(0, this.canvas.height);
            this.ctx.strokeStyle = '#f97316'; this.ctx.lineWidth = 4;
            const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
            gradient.addColorStop(0, 'rgba(249, 115, 22, 0)');
            gradient.addColorStop(1, 'rgba(249, 115, 22, 0.4)');
            this.ctx.fillStyle = gradient;

            for(let t=0; t <= visualMaxTime; t+=0.05) {
                const x = (t / visualMaxTime) * this.canvas.width;
                if (x > this.canvas.width) break;

                const y_mult = Math.exp(t * 0.17);
                const y_max_mult = this.VISUAL_MAX_MULTIPLIER;
                const y = this.canvas.height - ((y_mult - 1) / (y_max_mult - 1)) * this.canvas.height;
                
                if (y_mult > displayMultiplier) break;
                this.ctx.lineTo(x, y);
            }
            const currentElapsedTime = (Date.now() - this.startTime) / 1000;
            const currentX = (currentElapsedTime / visualMaxTime) * this.canvas.width;
            this.ctx.lineTo(Math.min(currentX, this.canvas.width), this.canvas.height);
            this.ctx.closePath();
            
            this.ctx.stroke();
            this.ctx.fill();
        }
    },
    
    updateBetButtonState() {
        if (this.state === 'WAITING') {
            this.betBtn.disabled = balance < betAmount || betAmount <= 0;
        }
    },

    handleBet() {
        if(this.state === 'WAITING') {
            if(betAmount > 0 && balance >= betAmount) {
                balance -= betAmount; updateAllBalances();
                this.playerBet = { amount: betAmount };
                this.betBtn.textContent = '베팅 완료'; this.betBtn.disabled = true;
                showMessage(`₩${betAmount.toLocaleString()} 베팅 완료!`, 'success');
            } else { showMessage('잔액이 부족하거나 베팅 금액이 올바르지 않습니다.'); }
        } else if (this.state === 'RUNNING' && this.playerBet) {
            const winnings = this.playerBet.amount * this.multiplier;
            balance += winnings; updateAllBalances();
            showMessage(`₩${winnings.toLocaleString()} 획득! (${this.multiplier.toFixed(2)}x)`, 'success');
            this.playerBet = null;
            this.betBtn.textContent = '획득 완료'; this.betBtn.disabled = true;
        }
    }
};