// Firebase config - replace with your actual config
window.__firebase_config = '{"apiKey":"your-api-key","authDomain":"your-project.firebaseapp.com","projectId":"your-project","storageBucket":"your-project.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abcdef"}';
window.__app_id = 'speed-challenge-app';
window.__initial_auth_token = undefined;

// Icons (using simple text or you can use SVG)
const icons = {
    Play: '▶',
    Trophy: '🏆',
    Zap: '⚡',
    CheckCircle2: '✓',
    XCircle: '✗',
    RotateCcw: '↻',
    Home: '🏠',
    Languages: '🌐',
    Timer: '⏱',
    Globe: '🌍',
    User: '👤',
    Swords: '⚔'
};

// Game data
const GAMES_DATA = {
    Quiz: {
        Beginner: [
            { q: "「這不合我的胃口。」", a: "It's not my cup of tea.", o: ["It's not my cup of tea.", "It's not my taste.", "I don't eat this.", "Not my food."] },
            { q: "「我不知道。」", a: "I don't know.", o: ["I don't know.", "I no know.", "I not know.", "I don't knew."] },
            { q: "「不用客氣。」", a: "You're welcome.", o: ["You're welcome.", "No thanks.", "Please.", "Welcome you."] },
            { q: "「我正在努力戒掉喝咖啡的習慣。」", a: "I am trying to break the habit of drinking coffee.", o: ["I am trying to break the habit of drinking coffee.", "I am killing my coffee habit.", "I am stopping my coffee.", "I want to delete drinking coffee."] },
            { q: "「別讓他逃避責任。」", a: "Don't let him off the hook.", o: ["Don't let him off the hook.", "Don't let him run away.", "Don't let him lose.", "Don't give him free."] }
        ]
    },
    Speed: [
        { word: "ACCURATE", hint: "準確的" },
        { word: "BELIEVE", hint: "相信" },
        { word: "CREATIVE", hint: "有創意的" },
        { word: "DYNAMIC", hint: "動態的" },
        { word: "EFFICIENT", hint: "有效率的" },
        { word: "CHALLENGE", hint: "挑戰" },
        { word: "FUTURE", hint: "未來" },
        { word: "SUCCESS", hint: "成功" },
        { word: "FREEDOM", hint: "自由" },
        { word: "JOURNEY", hint: "旅程" }
    ]
};

class App {
    constructor() {
        this.state = {
            user: null,
            userName: localStorage.getItem('eng_hub_name') || `玩家${Math.floor(Math.random() * 9000) + 1000}`,
            view: 'launcher',
            gameMode: 'Quiz',
            subMode: 'Practice',
            leaderboard: [],
            questions: [],
            currentIndex: 0,
            score: 0,
            isAnswered: false,
            userInput: "",
            selectedAnswer: null,
            timeLeft: 10
        };
        this.timerRef = null;
        this.autoNextTimeoutRef = null;
        this.appElement = document.getElementById('app');
        this.init();
    }

    init() {
        this.initAuth();
        this.render();
    }

    initAuth() {
        try {
            const { initializeApp, getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } = window.firebase;
            const firebaseConfig = JSON.parse(window.__firebase_config);
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);

            const initAuth = async () => {
                try {
                    if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
                        await signInWithCustomToken(auth, window.__initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (err) {
                    console.error("驗證失敗:", err);
                }
            };
            initAuth();
            onAuthStateChanged(auth, (u) => {
                this.setState({ user: u });
                if (u) this.listenLeaderboard();
            });
        } catch (err) {
            console.error("Firebase 配置錯誤:", err);
            // 如果 Firebase 配置無效，設置 user 為 null
            this.setState({ user: null });
        }
    }

    componentDidMount() {
        this.listenLeaderboard();
    }

    listenLeaderboard() {
        if (!this.state.user) return;
        try {
            const { getFirestore, collection, onSnapshot } = window.firebase;
            const db = getFirestore();
            const lbCollection = collection(db, 'artifacts', window.__app_id, 'public', 'data', 'leaderboard');
            onSnapshot(lbCollection, (snapshot) => {
                const data = snapshot.docs.map(doc => doc.data());
                const sortedData = data.sort((a, b) => (b.score || 0) - (a.score || 0));
                this.setState({ leaderboard: sortedData.slice(0, 10) });
            }, (err) => {
                console.error("讀取排行榜失敗:", err);
            });
        } catch (err) {
            console.error("排行榜監聽失敗:", err);
        }
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    startTimer() {
        this.setState({ timeLeft: 10 });
        if (this.timerRef) clearInterval(this.timerRef);
        this.timerRef = setInterval(() => {
            this.setState(prev => {
                if (prev.timeLeft <= 1) {
                    clearInterval(this.timerRef);
                    this.handleTimeUp();
                    return { timeLeft: 0 };
                }
                return { timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);
    }

    handleTimeUp() {
        this.checkAnswer("");
        this.autoNextTimeoutRef = setTimeout(() => {
            this.nextStep();
        }, 1500);
    }

    startGame() {
        let selected = [];
        if (this.state.gameMode === 'Quiz') {
            selected = [...GAMES_DATA.Quiz.Beginner].sort(() => 0.5 - Math.random()).slice(0, 5);
        } else {
            selected = [...GAMES_DATA.Speed].sort(() => 0.5 - Math.random()).slice(0, 10);
        }

        this.setState({
            questions: selected,
            currentIndex: 0,
            score: 0,
            isAnswered: false,
            userInput: "",
            selectedAnswer: null,
            view: this.state.gameMode.toLowerCase()
        });
        if (this.state.gameMode === 'Speed') this.startTimer();
    }

    checkAnswer(answer) {
        if (this.state.isAnswered) return;
        if (this.timerRef) clearInterval(this.timerRef);
        this.setState({ isAnswered: true, selectedAnswer: answer });

        const currentQ = this.state.questions[this.state.currentIndex];
        const correct = (currentQ.a || currentQ.word).toLowerCase().trim().replace(/\s/g, '');
        const userAnswer = answer.toLowerCase().trim().replace(/\s/g, '');
        const isCorrect = userAnswer === correct;

        if (isCorrect) this.setState({ score: this.state.score + 1 });
    }

    nextStep() {
        if (this.autoNextTimeoutRef) clearTimeout(this.autoNextTimeoutRef);
        if (this.state.currentIndex < this.state.questions.length - 1) {
            this.setState({
                currentIndex: this.state.currentIndex + 1,
                isAnswered: false,
                userInput: "",
                selectedAnswer: null
            });
            if (this.state.gameMode === 'Speed') this.startTimer();
        } else {
            this.finishGame();
        }
    }

    async finishGame() {
        if (this.timerRef) clearInterval(this.timerRef);
        if (this.autoNextTimeoutRef) clearTimeout(this.autoNextTimeoutRef);

        if (this.state.subMode === 'Battle' && this.state.user) {
            try {
                const { getFirestore, doc, setDoc } = window.firebase;
                const db = getFirestore();
                const userRef = doc(db, 'artifacts', window.__app_id, 'public', 'data', 'leaderboard', this.state.user.uid);
                await setDoc(userRef, {
                    uid: this.state.user.uid,
                    name: this.state.userName,
                    score: this.state.score,
                    timestamp: Date.now()
                });
            } catch (err) {
                console.error("上傳分數失敗:", err);
            }
        }
        this.setState({ view: 'result' });
    }

    render() {
        this.appElement.innerHTML = '';
        if (this.state.view === 'launcher') {
            this.renderLauncher();
        } else if (this.state.view === 'quiz' || this.state.view === 'speed') {
            this.renderGame();
        } else if (this.state.view === 'result') {
            this.renderResult();
        }
    }

    renderLauncher() {
        const container = document.createElement('div');
        container.className = 'min-h-screen bg-slate-50 flex items-center justify-center p-4';

        const card = document.createElement('div');
        card.className = 'max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden';

        const header = document.createElement('div');
        header.className = 'bg-indigo-600 p-8 text-white';
        header.innerHTML = `
            <h1 class="text-3xl font-black italic">ENGLISH ARENA</h1>
            <p class="opacity-70 text-sm">單字挑戰對戰版</p>
            <div class="mt-4 flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/20">
                <span class="w-4 h-4">${icons.User}</span>
                <input id="userNameInput" value="${this.state.userName}" class="bg-transparent outline-none text-sm font-bold w-full" placeholder="輸入你的暱稱" />
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'p-6 space-y-6';

        const modeSwitch = document.createElement('div');
        modeSwitch.className = 'flex bg-slate-100 p-1 rounded-2xl';
        modeSwitch.innerHTML = `
            <button id="practiceBtn" class="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${this.state.subMode === 'Practice' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}">${icons.Zap} 練習</button>
            <button id="battleBtn" class="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${this.state.subMode === 'Battle' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}">${icons.Swords} 對戰</button>
        `;

        const gameModes = document.createElement('div');
        gameModes.className = 'grid grid-cols-2 gap-3';
        gameModes.innerHTML = `
            <button id="quizBtn" class="p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${this.state.gameMode === 'Quiz' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}">
                ${icons.Languages} <span class="font-bold">中翻英</span>
            </button>
            <button id="speedBtn" class="p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${this.state.gameMode === 'Speed' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}">
                ${icons.Timer} <span class="font-bold">限時拼字</span>
            </button>
        `;

        let leaderboardHtml = '';
        if (this.state.subMode === 'Battle') {
            leaderboardHtml = `
                <div class="bg-slate-50 rounded-2xl p-4">
                    <h3 class="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">${icons.Globe} 全球排行榜</h3>
                    <div class="space-y-2">
                        ${!this.state.user ? '<p class="text-xs text-slate-400 text-center py-2 italic">連線中...</p>' :
                            this.state.leaderboard.length === 0 ? '<p class="text-xs text-slate-400 text-center py-2 italic">尚無數據</p>' :
                            this.state.leaderboard.map((entry, i) => `
                                <div class="flex items-center justify-between p-2 rounded-lg ${entry.uid === this.state.user?.uid ? 'bg-indigo-100 ring-1 ring-indigo-200' : 'bg-white shadow-sm'}">
                                    <div class="flex items-center gap-2">
                                        <span class="text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${i < 3 ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-500'}">${i + 1}</span>
                                        <span class="text-sm font-bold truncate max-w-[100px]">${entry.name}</span>
                                    </div>
                                    <span class="text-indigo-600 font-black text-sm">${entry.score} 分</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
        }

        const startBtn = document.createElement('button');
        startBtn.id = 'startBtn';
        startBtn.className = `w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${this.state.subMode === 'Battle' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`;
        startBtn.innerHTML = `開始挑戰 ${icons.Play}`;
        startBtn.onclick = () => this.startGame();

        body.appendChild(modeSwitch);
        body.appendChild(gameModes);
        if (leaderboardHtml) body.insertAdjacentHTML('beforeend', leaderboardHtml);
        body.appendChild(startBtn);

        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
        this.appElement.appendChild(container);

        // Event listeners
        document.getElementById('userNameInput').addEventListener('input', (e) => {
            this.setState({ userName: e.target.value });
            localStorage.setItem('eng_hub_name', e.target.value);
        });
        document.getElementById('practiceBtn').addEventListener('click', () => this.setState({ subMode: 'Practice' }));
        document.getElementById('battleBtn').addEventListener('click', () => this.setState({ subMode: 'Battle' }));
        document.getElementById('quizBtn').addEventListener('click', () => this.setState({ gameMode: 'Quiz' }));
        document.getElementById('speedBtn').addEventListener('click', () => this.setState({ gameMode: 'Speed' }));
    }

    renderGame() {
        const currentQ = this.state.questions[this.state.currentIndex];
        if (!currentQ) return;

        const correct = (currentQ.a || currentQ.word).toLowerCase().trim().replace(/\s/g, '');
        const userAnswer = (this.state.selectedAnswer || this.state.userInput).toLowerCase().trim().replace(/\s/g, '');
        const isCorrect = userAnswer === correct;

        const container = document.createElement('div');
        container.className = 'min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4';

        const card = document.createElement('div');
        card.className = 'max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 relative overflow-hidden';

        if (this.state.gameMode === 'Speed' && !this.state.isAnswered) {
            const timerBar = document.createElement('div');
            timerBar.className = `absolute top-0 left-0 h-1.5 transition-all duration-1000 linear ${this.state.timeLeft <= 3 ? 'bg-red-500' : 'bg-indigo-500'}`;
            timerBar.style.width = `${(this.state.timeLeft / 10) * 100}%`;
            card.appendChild(timerBar);
        }

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-6';
        header.innerHTML = `
            <span class="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${this.state.subMode === 'Battle' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}">${this.state.subMode} MODE</span>
            <span class="text-slate-400 font-bold text-sm bg-slate-50 px-3 py-1 rounded-lg">${this.state.currentIndex + 1} / ${this.state.questions.length}</span>
        `;

        const question = document.createElement('div');
        question.className = 'text-center';
        question.innerHTML = `<h2 class="text-2xl md:text-3xl font-black text-slate-800 mb-8 min-h-[4rem] flex items-center justify-center">${currentQ.q || currentQ.hint}</h2>`;

        let inputSection = '';
        if (this.state.gameMode === 'Quiz') {
            inputSection = `
                <div class="grid grid-cols-1 gap-3">
                    ${currentQ.o.map((opt, i) => `
                        <button class="option-btn p-4 rounded-2xl border-2 font-bold transition-all text-left px-6 ${this.state.isAnswered ? (opt === currentQ.a ? 'border-green-500 bg-green-50 text-green-700' : 'opacity-40 border-slate-100') : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30'}" data-answer="${opt}" ${this.state.isAnswered ? 'disabled' : ''}>${opt}</button>
                    `).join('')}
                </div>
            `;
        } else {
            inputSection = `
                <div class="space-y-6">
                    <div class="flex flex-wrap justify-center gap-2">
                        ${currentQ.word.split('').sort(() => 0.5 - Math.random()).map(char => `<span class="w-8 h-10 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 font-black text-lg border-b-2 border-slate-200 uppercase">${char}</span>`).join('')}
                    </div>
                    <input id="userInput" value="${this.state.userInput}" class="w-full p-5 rounded-2xl border-2 text-center text-3xl font-black outline-none transition-all ${this.state.isAnswered ? (isCorrect ? 'border-green-500 bg-green-50 text-green-600' : 'border-red-500 bg-red-50 text-red-600') : 'border-slate-200 focus:border-indigo-500 shadow-inner'}" placeholder="TYPE HERE..." ${this.state.isAnswered ? 'disabled' : ''} />
                </div>
            `;
        }

        question.insertAdjacentHTML('beforeend', inputSection);

        card.appendChild(header);
        card.appendChild(question);

        if (this.state.isAnswered) {
            const result = document.createElement('div');
            result.className = 'mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300';
            result.innerHTML = `
                <div class="p-5 rounded-2xl font-bold flex items-center justify-between mb-4 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    <div class="flex flex-col">
                        <span class="text-[10px] uppercase opacity-60 tracking-wider">Correct Answer</span>
                        <span class="text-lg">${currentQ.a || currentQ.word}</span>
                    </div>
                    ${isCorrect ? icons.CheckCircle2 : icons.XCircle}
                </div>
                <button id="nextBtn" class="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                    ${this.state.currentIndex < this.state.questions.length - 1 ? 'NEXT QUESTION' : 'VIEW RESULTS'}
                </button>
                ${this.state.gameMode === 'Speed' ? `<p class="text-center text-[10px] text-slate-400 mt-3 italic animate-pulse">${this.state.timeLeft === 0 ? "Time's up! Moving to next automatically..." : "Press NEXT or wait to proceed."}</p>` : ''}
            `;
            card.appendChild(result);
        }

        container.appendChild(card);
        this.appElement.appendChild(container);

        // Event listeners
        if (this.state.gameMode === 'Quiz') {
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', () => this.checkAnswer(btn.dataset.answer));
            });
        } else {
            const input = document.getElementById('userInput');
            input.addEventListener('input', (e) => this.setState({ userInput: e.target.value }));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.checkAnswer(this.state.userInput);
            });
        }
        if (document.getElementById('nextBtn')) {
            document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        }
    }

    renderResult() {
        const container = document.createElement('div');
        container.className = 'min-h-screen bg-white flex flex-col items-center justify-center p-4';

        const content = document.createElement('div');
        content.className = 'max-w-md w-full text-center space-y-8';

        content.innerHTML = `
            <div class="relative inline-block">
                <div class="w-24 h-24 text-yellow-500 mx-auto animate-bounce">${icons.Trophy}</div>
                <div class="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-lg">FINISH!</div>
            </div>
            <h1 class="text-4xl font-black text-slate-900 tracking-tight">挑戰完成！</h1>
            <div class="bg-slate-50 p-10 rounded-[3rem] shadow-inner border border-slate-100">
                <div class="text-7xl font-black text-indigo-600 mb-2">${this.state.score}</div>
                <div class="text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">Final Score</div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
                <button id="retryBtn" class="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">${icons.RotateCcw} 再試一次</button>
                <button id="homeBtn" class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95">${icons.Home} 回主頁</button>
            </div>
        `;

        container.appendChild(content);
        this.appElement.appendChild(container);

        // Event listeners
        document.getElementById('retryBtn').addEventListener('click', () => this.startGame());
        document.getElementById('homeBtn').addEventListener('click', () => this.setState({ view: 'launcher' }));
    }
}

// Initialize app
new App();