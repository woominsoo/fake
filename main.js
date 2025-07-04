const authView = document.getElementById('authView');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authTitle = document.getElementById('authTitle');
const authToggle = document.getElementById('authToggle');
const welcomeMessage = document.getElementById('welcomeMessage');

const lobbyView = document.getElementById('lobbyView');
const messageBox = document.getElementById('messageBox');
const chargeModal = document.getElementById('chargeModal');
const closeModalBtn = document.getElementById('closeModalBtn');

let balance = 0;
let betAmount = 100;
let activeGame = null;
let currentUser = null;

const getUsers = () => JSON.parse(localStorage.getItem('mini_game_users')) || {};
const saveUsers = (users) => localStorage.setItem('mini_game_users', JSON.stringify(users));

function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    const users = getUsers();

    if (users[username]) {
        showMessage('이미 존재하는 아이디입니다.');
        return;
    }

    users[username] = { password: password, balance: 1000 };
    saveUsers(users);
    showMessage('회원가입 성공! 로그인 해주세요.', 'success');
    toggleAuthForm();
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const users = getUsers();

    if (users[username] && users[username].password === password) {
        currentUser = username;
        balance = users[username].balance;
        
        authView.classList.add('hidden');
        lobbyView.classList.remove('hidden');
        welcomeMessage.textContent = `${currentUser}님, 환영합니다!`;
        updateAllBalances();
        updateBetControls();
        showMessage(`로그인 성공!`, 'success');
    } else {
        showMessage('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
}

function handleLogout() {
    if (currentUser) {
        const users = getUsers();
        if (users[currentUser]) {
            users[currentUser].balance = balance;
            saveUsers(users);
        }
    }

    currentUser = null;
    balance = 0;
    
    plinkoGame.view.classList.add('hidden');
    crashGame.view.classList.add('hidden');
    lobbyView.classList.add('hidden');

    authView.classList.remove('hidden');
    loginForm.reset();
    signupForm.reset();
}

function toggleAuthForm() {
    if (loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        authTitle.textContent = '로그인';
        authToggle.textContent = '계정이 없으신가요? 회원가입';
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authTitle.textContent = '회원가입';
        authToggle.textContent = '이미 계정이 있으신가요? 로그인';
    }
}

function showMessage(msg, type = 'error') {
    messageBox.textContent = msg;
    messageBox.classList.remove('bg-red-500', 'bg-green-500');
    messageBox.classList.add(type === 'error' ? 'bg-red-500' : 'bg-green-500');
    messageBox.classList.remove('opacity-0');
    setTimeout(() => messageBox.classList.add('opacity-0'), 3000);
}

function formatCurrency(amount) {
    return `₩${Math.floor(amount).toLocaleString('ko-KR')}`;
}

function updateAllBalances() {
    document.querySelectorAll('.balance').forEach(el => el.textContent = formatCurrency(balance));
}

function updateBetControls() {
    document.querySelectorAll('.betAmount').forEach(el => {
        el.value = Math.floor(betAmount).toLocaleString('ko-KR');
    });
    
    const percentage = balance > 0 ? (betAmount / balance) * 100 : 0;
    document.querySelectorAll('.bet-slider').forEach(slider => {
        slider.value = percentage;
    });
    document.querySelectorAll('.bet-percentage').forEach(el => {
        el.textContent = `${Math.floor(percentage)}%`;
    });

    if (activeGame && activeGame.updateBetButtonState) {
        activeGame.updateBetButtonState();
    }
}

function adjustBet(multiplier) {
    let newBet = betAmount * multiplier;
    if (newBet < 1) newBet = 1;
    if (newBet > balance) newBet = balance;
    betAmount = newBet;
    updateBetControls();
}

const gameManager = {
    switchTo: (game) => {
        if (!currentUser) {
            showMessage("로그인이 필요합니다.");
            return;
        }
        if (activeGame && activeGame.stop && activeGame !== game) {
            activeGame.stop();
        }
        lobbyView.classList.add('hidden');
        plinkoGame.view.classList.add('hidden');
        crashGame.view.classList.add('hidden');
        
        game.view.classList.remove('hidden');
        
        if (!game.initialized) {
            game.init();
        } else if (game.start) {
            game.start();
        }
        
        activeGame = game;
    }
};

function setupGlobalEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    authToggle.addEventListener('click', toggleAuthForm);
    document.querySelectorAll('.logoutBtn, #logoutBtnLobby, #logoutBtnGame').forEach(btn => btn.addEventListener('click', handleLogout));

    document.getElementById('plinkoLobbyBtn').addEventListener('click', () => gameManager.switchTo(plinkoGame));
    document.getElementById('crashLobbyBtn').addEventListener('click', () => gameManager.switchTo(crashGame));

    document.querySelectorAll('.menuBtn').forEach(btn => btn.addEventListener('click', () => {
        if (activeGame && activeGame.stop) {
            activeGame.stop();
        }
        activeGame = null;
        plinkoGame.view.classList.add('hidden');
        crashGame.view.classList.add('hidden');
        lobbyView.classList.remove('hidden');
    }));
    
    document.querySelectorAll('.chargeBtn').forEach(btn => btn.addEventListener('click', () => chargeModal.classList.remove('hidden')));
    closeModalBtn.addEventListener('click', () => chargeModal.classList.add('hidden'));
    chargeModal.addEventListener('click', (e) => { if (e.target === chargeModal) chargeModal.classList.add('hidden'); });
    
    document.querySelectorAll('.charge-amount-btn').forEach(btn => btn.addEventListener('click', () => {
        const amount = parseInt(btn.dataset.amount, 10);
        balance += amount; 
        updateAllBalances();
        updateBetControls();
        showMessage(`₩${amount.toLocaleString()}이 충전되었습니다.`, 'success');
    }));

    document.querySelectorAll('.betHalf').forEach(btn => btn.addEventListener('click', () => adjustBet(0.5)));
    document.querySelectorAll('.betDouble').forEach(btn => btn.addEventListener('click', () => adjustBet(2)));
    
    document.querySelectorAll('.betAmount').forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            betAmount = value ? parseInt(value, 10) : 0;
            updateBetControls();
        });
        input.addEventListener('blur', (e) => {
            if (betAmount > balance) betAmount = balance;
            if (betAmount < 1 && balance > 0) betAmount = 1;
            updateBetControls();
        });
    });
    
    document.querySelectorAll('.bet-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            if (balance <= 0) {
                e.target.value = 0;
                return;
            };
            const percentage = parseInt(e.target.value, 10);
            betAmount = (balance * percentage) / 100;
            updateBetControls();
        });
    });

    plinkoGame.view.querySelector('.plinkoBetBtn').addEventListener('click', () => plinkoGame.placeBet());
    crashGame.view.querySelector('.crashBetBtn').addEventListener('click', () => crashGame.handleBet());
}

setupGlobalEventListeners();