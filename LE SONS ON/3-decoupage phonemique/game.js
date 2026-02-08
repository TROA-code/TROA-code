// --- CONFIGURATION DES CHEMINS D'IMAGES ---
// --- DONNÉES CATALOGUE ---
// Liste chargée dynamiquement depuis un fichier JSON
let VALID_WORDS = [];

async function loadCatalogue() {
    try {
        const response = await fetch('./mots.json');
        const data = await response.json();
        // Filtre uniquement les mots qui CONTIENNENT le son [ON] pour cet exercice
        VALID_WORDS = data.filter(w => w.target && w.target.length > 0);
        render();
    } catch (e) {
        console.error("Erreur chargement catalogue:", e);
        document.getElementById('game-grid').innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-8 text-center text-red-500 gap-4">
                <span class="material-symbols-outlined text-6xl">error</span>
                <h2 class="text-2xl font-bold">Impossible de charger les mots</h2>
                <p>Assurez-vous de lancer le jeu via un serveur local (ex: Live Server).</p>
                <p class="text-sm text-gray-500">${e.message}</p>
            </div>
        `;
    }
}

let currentChallengeIndex = 0;
let state = [];
let gameStarted = false;

// --- AUDIO (Tone.js) ---
const synth = new Tone.PolySynth(Tone.Synth).toDestination();
synth.set({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 1 }
});

function playWinMelody() {
    const now = Tone.now();
    synth.triggerAttackRelease("C4", "16n", now);
    synth.triggerAttackRelease("E4", "16n", now + 0.1);
    synth.triggerAttackRelease("G4", "16n", now + 0.2);
    synth.triggerAttackRelease("C5", "8n", now + 0.3);
}

function playFullWinMusic() {
    const now = Tone.now();
    ["C4", "E4", "G4", "C5", "E5", "G5", "C6"].forEach((note, i) => {
        synth.triggerAttackRelease(note, "16n", now + i * 0.1);
    });
}

// --- RENDU ---
// --- INIT & MENU ---
function startGame(count) {
    // Sélection aléatoire
    const shuffled = [...VALID_WORDS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    state = selected.map((item, index) => ({
        id: index + 1,
        word: item.label || item.word, // Use label for display/speech if available
        count: item.syllables,
        targetIndices: item.target,
        img: `../images/${item.word}.png`,
        isRevealed: false,
        showCircles: false,
        userChoices: new Array(item.syllables).fill(false),
        isDone: false
    }));

    currentChallengeIndex = 0;
    gameStarted = true;
    render();
}

function showMenu() {
    gameStarted = false;
    render();
}

// --- RENDU ---
function render() {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';

    // MENU DE SÉLECTION
    if (!gameStarted) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 gap-12 w-full animate-pop">
                <h2 class="text-4xl font-bold text-slate-700 text-center">Combien de mots veux-tu travailler ?</h2>
                <div class="flex flex-wrap justify-center gap-8">
                    <button onclick="startGame(4)" class="group relative flex flex-col items-center justify-center gap-4 w-64 h-64 bg-white rounded-[3rem] border-8 border-blue-100 hover:border-blue-400 hover:-translate-y-2 transition-all shadow-xl hover:shadow-2xl">
                        <div class="text-8xl font-black text-blue-500 group-hover:scale-110 transition-transform">4</div>
                        <span class="text-2xl font-bold text-slate-500 uppercase tracking-widest">Mots</span>
                    </button>
                    <button onclick="startGame(8)" class="group relative flex flex-col items-center justify-center gap-4 w-64 h-64 bg-white rounded-[3rem] border-8 border-purple-100 hover:border-purple-400 hover:-translate-y-2 transition-all shadow-xl hover:shadow-2xl">
                        <div class="text-8xl font-black text-purple-500 group-hover:scale-110 transition-transform">8</div>
                        <span class="text-2xl font-bold text-slate-500 uppercase tracking-widest">Mots</span>
                    </button>
                    <button onclick="startGame(12)" class="group relative flex flex-col items-center justify-center gap-4 w-64 h-64 bg-white rounded-[3rem] border-8 border-orange-100 hover:border-orange-400 hover:-translate-y-2 transition-all shadow-xl hover:shadow-2xl">
                        <div class="text-8xl font-black text-orange-500 group-hover:scale-110 transition-transform">12</div>
                        <span class="text-2xl font-bold text-slate-500 uppercase tracking-widest">Mots</span>
                    </button>
                </div>
            </div>
        `;
        document.getElementById('global-status').textContent = '';
        return;
    }

    // VICTOIRE
    if (currentChallengeIndex >= state.length) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 text-center space-y-8 animate-pop">
                <div class="text-9xl">🏆</div>
                <h2 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Félicitations !</h2>
                <p class="text-3xl text-gray-600">Tu as réussi les ${state.length} exercices !</p>
                <button onclick="showMenu()" class="bg-blue-600 text-white text-2xl font-bold py-4 px-12 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-3">
                    <span class="material-symbols-outlined text-4xl">home</span> Retour au menu
                </button>
            </div>
            `;
        playFullWinMusic();
        document.getElementById('global-status').innerHTML = '👑 CHAMPION ! 👑';
        return;
    }

    const item = state[currentChallengeIndex];
    const idx = currentChallengeIndex;

    const row = document.createElement('div');
    row.className = `flex flex-col xl:flex-row items-center justify-between gap-12 p-8 rounded-[4rem] transition-all duration-500 w-full ${item.isDone ? 'success-bg shadow-inner border border-emerald-100' : ''}`;

    row.innerHTML = `
        <!-- GAUCHE : Image et Numéro -->
        <div class="flex flex-col items-center gap-6 shrink-0">
            <div class="flex items-center gap-4">
                <div class="token-num active text-xl w-24 h-24 border-4 flex items-center justify-center">
                    ${currentChallengeIndex + 1}/${state.length}
                </div>
                <h3 class="text-xl font-bold text-slate-400">Exercice</h3>
            </div>
            <div onclick="revealWord(${idx})" class="image-card w-64 h-64 border-8 hover:scale-105 transition-transform">
                <img src="${item.img}" class="w-full h-full object-cover" alt="${item.word}" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\'text-gray-300 italic text-xs\'>Image: ${item.img}</span>'">
            </div>
        </div>

        <!-- CENTRE : Mot et Audio -->
        <div class="flex-1 flex flex-col items-center justify-center min-h-[120px]">
            ${item.isRevealed ? `
                <div class="flex flex-col items-center gap-4 fade-in">
                    <span onclick="revealCircles(${idx})" class="word-btn cursive text-7xl select-none hover:tracking-wide transition-all">${item.word}</span>
                    <button onclick="sayWord('${item.word}')" class="text-slate-300 hover:text-blue-500 transition scale-110 active:scale-95">
                        <span class="material-symbols-outlined text-6xl">volume_up</span>
                    </button>
                </div>
            ` : '<p class="text-slate-400 text-2xl italic animate-pulse">1. Clique sur l\'image</p>'}
        </div>

        <!-- DROITE : Ronds et Validation -->
        <div class="flex-1 flex flex-col items-center justify-center min-h-[200px] gap-8">
            ${item.showCircles ? `
                <div class="flex gap-4 justify-center flex-nowrap fade-in">
                    ${item.userChoices.map((marked, mIdx) => `
                        <div onclick="toggleMark(${idx}, ${mIdx})" class="segment-circle ${marked ? 'marked' : ''} w-24 h-24 text-5xl border-[6px] shrink-0"></div>
                    `).join('')}
                </div>
                
                <div class="h-20 flex items-center justify-center w-full relative">
                    ${!item.isDone ? `
                        <button onclick="checkExercise(${idx})" class="validate-btn text-xl py-3 px-10 hover:scale-105 active:scale-95 transition-transform shadow-lg">
                            <span class="material-symbols-outlined text-3xl">verified</span> VALIDER
                        </button>
                        <div id="fb-${idx}" class="absolute top-full mt-4 font-black text-2xl text-center w-full pointer-events-none whitespace-nowrap"></div>
                    ` : `
                        <button onclick="nextExercise()" class="bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-3 px-10 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-3 animate-bounce">
                            Suivant <span class="material-symbols-outlined text-3xl">arrow_forward</span>
                        </button>
                    `}
                </div>
            ` : item.isRevealed ? '<p class="text-slate-400 text-xl italic animate-pulse">2. Clique sur le mot</p>' : ''}
        </div>
    `;
    grid.appendChild(row);

    updateGlobalStatus();
}

// --- ACTIONS ---
function nextExercise() {
    currentChallengeIndex++;
    render();
}

function revealWord(idx) {
    if (state[idx].isRevealed) {
        sayWord(state[idx].word);
        return;
    }
    state[idx].isRevealed = true;
    sayWord(state[idx].word);
    render();
}

function revealCircles(idx) {
    if (state[idx].isRevealed && !state[idx].showCircles) {
        state[idx].showCircles = true;
        render();
    }
}

function toggleMark(exIdx, markIdx) {
    if (state[exIdx].isDone) return;
    state[exIdx].userChoices[markIdx] = !state[exIdx].userChoices[markIdx];
    render();
}

async function checkExercise(idx) {
    const item = state[idx];
    const feedback = document.getElementById(`fb-${idx}`);
    const selected = item.userChoices.map((v, i) => v ? i : null).filter(v => v !== null);

    if (JSON.stringify(selected.sort()) === JSON.stringify(item.targetIndices.sort())) {
        state[idx].isDone = true;
        await Tone.start();
        playWinMelody();
        render();
    } else {
        feedback.innerHTML = '<span class="text-red-500 animate-shake block">Réessaie !</span>';
        setTimeout(() => { if (feedback) feedback.innerHTML = ''; }, 1500);
    }
}

function sayWord(t) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'fr-FR';
        u.rate = 0.8;
        window.speechSynthesis.speak(u);
    }
}

function updateGlobalStatus() {
    if (!gameStarted) {
        document.getElementById('global-status').textContent = '';
        return;
    }
}

function resetGame() {
    showMenu();
}

window.onload = loadCatalogue;
