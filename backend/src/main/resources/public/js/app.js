import { Chat } from './chat.js';
import { PeerConnection } from './peer-connection.js';
import { BeatPlayer } from './beat.js';

const beatPlayer = new BeatPlayer();

const TOPICS = [
    "Artificial Intelligence", "Street Life", "The Future", "Money & Power",
    "Love & Heartbreak", "Politics", "Sports", "Space", "Food & Hunger",
    "Social Media", "Fashion", "Family", "War & Peace", "Technology",
    "Dreams", "Time", "Identity", "Success", "Failure", "Loyalty",
    "Betrayal", "The City", "Nature", "Revolution", "Education",
    "Health", "Music", "Art", "Freedom", "Justice", "The Hustle",
    "Legacy", "Fear", "Confidence", "Underground", "Fame",
    "Survival", "Community", "Youth", "Old School vs New School",
    "Fake vs Real", "The Grind", "Respect", "Power", "The Internet",
    "Climate", "Nostalgia", "The American Dream", "Midnight", "Rain",
];

// ── State ──────────────────────────────────────────────────────────────────
let score = JSON.parse(localStorage.getItem('freestyleScore') ?? '{"wins":0,"losses":0,"streak":0}');
let myRole = null;          // "FIRST" | "SECOND"
let roundDuration = 60;     // seconds
let timerInterval = null;
let myVote = null;          // "me" | "opponent" | "draw"
let theirVote = null;
let topicFirst  = null;     // topic FIRST raps about
let topicSecond = null;     // topic SECOND raps about
let myTopicForThem  = null; // what I typed for my opponent
let theirTopicForMe = null; // what opponent typed for me

// ── DOM refs ───────────────────────────────────────────────────────────────
const timerEl    = document.getElementById('timerDisplay');
const topicEl    = document.getElementById('topicText');
const voteHintEl = document.getElementById('voteHint');

// ── Score ──────────────────────────────────────────────────────────────────
function saveScore() {
    localStorage.setItem('freestyleScore', JSON.stringify(score));
    document.getElementById('scoreWins').textContent    = score.wins;
    document.getElementById('scoreLosses').textContent  = score.losses;
    const streakEl = document.getElementById('streakDisplay');
    if (score.streak > 0)       streakEl.textContent = `🔥 ${score.streak}`;
    else if (score.streak < 0)  streakEl.textContent = `💀 ${Math.abs(score.streak)}`;
    else                        streakEl.textContent = `— 0`;
}

// ── Bell ───────────────────────────────────────────────────────────────────
function playGong() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const f = 520; // fundamental ~C5
        // Inharmonic partials typical of a struck bell: [freq_mult, volume, decay_sec]
        [[1.00, 0.9, 4.0], [1.19, 0.6, 3.0], [1.56, 0.4, 2.5], [2.00, 0.3, 2.0], [2.47, 0.2, 1.5]]
            .forEach(([mult, vol, dur]) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f * mult, now);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(vol, now + 0.003); // uderzenie ~3ms
                gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
                osc.start(now);
                osc.stop(now + dur);
            });
    } catch (e) { /* AudioContext not available */ }
}

// ── Timer ──────────────────────────────────────────────────────────────────
function startTimer(seconds, onEnd) {
    clearInterval(timerInterval);
    let remaining = seconds;
    renderTimer(remaining, seconds);
    timerInterval = setInterval(() => {
        remaining--;
        renderTimer(remaining, seconds);
        if (remaining <= 0) { clearInterval(timerInterval); playGong(); onEnd(); }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerEl.textContent = '—';
    timerEl.className = 'timer';
}

function renderTimer(remaining, total) {
    timerEl.textContent = remaining;
    timerEl.className = 'timer';
    if (remaining <= 10)             timerEl.classList.add('danger');
    else if (remaining <= total / 3) timerEl.classList.add('warn');
}

// ── Battle state ───────────────────────────────────────────────────────────
function setState(state) {
    document.body.dataset.state = state;
    chat.updateUi(state);
}

function resetBattle() {
    stopTimer();
    beatPlayer.stop();
    myVote = null;
    theirVote = null;
    topicFirst  = null;
    topicSecond = null;
    myTopicForThem  = null;
    theirTopicForMe = null;
    topicEl.textContent = '—';
    setBeatDisplay(null);
    document.querySelectorAll('.vote').forEach(b => b.disabled = false);
    voteHintEl.textContent = 'Cast your vote above';
    const topicInputEl = document.getElementById('topicInput');
    if (topicInputEl) { topicInputEl.value = ''; topicInputEl.disabled = false; }
    const submitBtn = document.getElementById('submitTopic');
    if (submitBtn)  { submitBtn.disabled = false; submitBtn.textContent = '✉ Submit'; }
    const aiTopicBtnEl = document.getElementById('aiTopicBtn');
    if (aiTopicBtnEl) { aiTopicBtnEl.disabled = false; aiTopicBtnEl.textContent = '🤖 AI'; }
    document.getElementById('startBattle').disabled = true;
}

function setBeatDisplay(name) {
    const el = document.getElementById('beatName');
    if (el) el.textContent = name ?? '—';
}

function handleResult() {
    const [m, t] = [myVote, theirVote];
    let msg;
    if (m === 'draw' || t === 'draw') {
        msg = "🤝 It's a draw! Both brought heat.";
        score.streak = 0;
    } else if (m === 'me' && t === 'opponent') {
        msg = "🏆 You WON! Both agree!";
        score.wins++;
        score.streak = score.streak > 0 ? score.streak + 1 : 1;
    } else if (m === 'opponent' && t === 'me') {
        msg = "😤 Opponent wins this one. Keep grinding!";
        score.losses++;
        score.streak = score.streak < 0 ? score.streak - 1 : -1;
    } else if (m === 'me' && t === 'me') {
        msg = "⚡ Both claimed the W — split decision!";
    } else {
        msg = "😂 Both gave props to the other — respect!";
    }
    saveScore();
    chat.addServerMessage(msg);
    voteHintEl.textContent = '➡ Click "Next Opponent" to battle again!';
    setState('RESULT');
}

// ── PeerConnection ─────────────────────────────────────────────────────────
const peerConnection = new PeerConnection({
    onLocalMedia:  stream => document.getElementById('localVideo').srcObject  = stream,
    onRemoteMedia: stream => document.getElementById('remoteVideo').srcObject = stream,

    onRole: role => {
        myRole = role;
        document.body.dataset.role = role;
    },

    onDataMessage: msg => {
        switch (msg.type) {
            case 'CHAT':
                chat.addRemoteMessage(msg.text);
                break;

            case 'TOPIC_SUBMITTED':
                theirTopicForMe = msg.topic;
                if (myRole === 'FIRST' && myTopicForThem) {
                    document.getElementById('startBattle').disabled = false;
                    chat.addServerMessage('✅ Opponent submitted their topic! Battle ready — start when you are.');
                } else if (myRole === 'FIRST') {
                    chat.addServerMessage('✅ Opponent submitted! Now submit your topic to unlock the battle.');
                } else {
                    chat.addServerMessage('✅ Opponent submitted a topic for you!');
                }
                break;

            case 'BATTLE_START':
                topicFirst  = msg.topicFirst;
                topicSecond = msg.topicSecond;
                roundDuration = msg.duration;
                setBeatDisplay(msg.beat);
                if (msg.beatUrl) {
                    beatPlayer.playUrl(msg.beatUrl);
                } else {
                    beatPlayer.play(msg.beat);
                }
                // show opponent's topic while they rap; YOUR topic stays hidden
                topicEl.textContent = topicFirst;
                chat.addServerMessage(`🎤 Beat: ${msg.beat} — Opponent raps first! Your topic drops when it's your turn...`);
                setState('THEIR_TURN');
                break;

            case 'TURN_SWITCH':
                // reveal YOUR topic for the first time
                topicEl.textContent = topicSecond;
                chat.addServerMessage(`🎤 Your topic: "${topicSecond}" — GO!`);
                setState('MY_TURN');
                startTimer(roundDuration, () => {
                    peerConnection.sendData({ type: 'BATTLE_END' });
                    stopTimer();
                    beatPlayer.stop();
                    setState('VOTING');
                    chat.addServerMessage("⏱ Time's up! Vote for the winner below.");
                });
                break;

            case 'BATTLE_END':
                stopTimer();
                beatPlayer.stop();
                setState('VOTING');
                chat.addServerMessage("⏱ Battle done! Vote for the winner below.");
                break;

            case 'VOTE':
                theirVote = msg.winner;
                if (myVote !== null) handleResult();
                else voteHintEl.textContent = 'Opponent voted ✓ — cast your vote!';
                break;
        }
    },

    onStateChange: state => {
        setState(state);
        if (state === 'CONNECTED') {
            resetBattle();
            if (myRole === 'FIRST') chat.addServerMessage('⚡ Connected! Write a topic for your opponent and submit it — both must submit before you can start.');
            else chat.addServerMessage('⏳ Connected! Write a topic for your opponent. Waiting for them to start the battle...');
        }
        if (state.startsWith('DISCONNECTED')) {
            stopTimer();
            myRole = null;
            delete document.body.dataset.role;
        }
    }
});

const chat = new Chat(peerConnection);

// ── Duration picker ────────────────────────────────────────────────────────
document.querySelectorAll('.dur').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.dur').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        roundDuration = parseInt(btn.dataset.dur);
    });
});

// ── Pairing buttons ────────────────────────────────────────────────────────
document.getElementById('startPairing').addEventListener('click', () => {
    beatPlayer.init(); // unlock AudioContext during user gesture
    peerConnection.setState('CONNECTING');
    peerConnection.sdpExchange.send(JSON.stringify({ name: 'PAIRING_START' }));
});

document.getElementById('abortPairing').addEventListener('click', () => {
    peerConnection.sdpExchange.send(JSON.stringify({ name: 'PAIRING_ABORT' }));
    peerConnection.disconnect('LOCAL');
});

document.getElementById('startBattle').addEventListener('click', () => {
    // use topics typed by each player; fallback to random
    topicFirst  = theirTopicForMe  ?? TOPICS[Math.floor(Math.random() * TOPICS.length)];
    topicSecond = myTopicForThem   ?? TOPICS[Math.floor(Math.random() * TOPICS.length)];
    if (topicFirst === topicSecond)
        do { topicSecond = TOPICS[Math.floor(Math.random() * TOPICS.length)]; } while (topicSecond === topicFirst);

    const urlInput = document.getElementById('beatUrlInput').value.trim();
    let beat, beatUrl = null;
    if (urlInput) {
        beatUrl = urlInput;
        beat    = urlInput.split('/').pop().split('?')[0] || 'Custom Beat';
        beatPlayer.playUrl(urlInput);
    } else {
        beat = BeatPlayer.random();
        beatPlayer.play(beat);
    }
    setBeatDisplay(beat);
    peerConnection.sendData({ type: 'BATTLE_START', topicFirst, topicSecond, beat, beatUrl, duration: roundDuration });

    // reveal YOUR topic now (FIRST goes first)
    topicEl.textContent = topicFirst;
    chat.addServerMessage(`🎤 Your topic: "${topicFirst}" — GO!`);
    setState('MY_TURN');
    startTimer(roundDuration, () => {
        peerConnection.sendData({ type: 'TURN_SWITCH' });
        stopTimer();
        // show what opponent will rap about while waiting
        topicEl.textContent = topicSecond;
        setState('THEIR_TURN');
        chat.addServerMessage(`⏱ Your time's up! Opponent's topic: "${topicSecond}"`);
    });
});

document.getElementById('submitTopic').addEventListener('click', () => {
    const val = document.getElementById('topicInput').value.trim();
    if (!val) return;
    myTopicForThem = val;
    peerConnection.sendData({ type: 'TOPIC_SUBMITTED', topic: val });
    document.getElementById('topicInput').disabled = true;
    const btn = document.getElementById('submitTopic');
    btn.disabled = true;
    btn.textContent = '✓ Sent';
    if (myRole === 'FIRST' && theirTopicForMe) {
        document.getElementById('startBattle').disabled = false;
        chat.addServerMessage('✅ Topic submitted! Both ready — start the battle!');
    } else if (myRole === 'FIRST') {
        chat.addServerMessage('✅ Topic submitted — waiting for opponent to submit theirs...');
    } else {
        chat.addServerMessage('✅ Topic submitted — waiting for opponent to start the battle!');
    }
});

document.getElementById('aiTopicBtn').addEventListener('click', async () => {
    const btn = document.getElementById('aiTopicBtn');
    btn.disabled = true;
    btn.textContent = '⏳';
    try {
        const res = await fetch('/api/topics/random?count=1');
        const data = await res.json();
        if (res.ok && data.topics && data.topics.length > 0) {
            document.getElementById('topicInput').value = data.topics[0];
            btn.textContent = '🤖 AI';
            btn.disabled = false;
        } else {
            btn.textContent = '⚠️';
            setTimeout(() => { btn.textContent = '🤖 AI'; btn.disabled = false; }, 2000);
        }
    } catch (e) {
        btn.textContent = '⚠️';
        setTimeout(() => { btn.textContent = '🤖 AI'; btn.disabled = false; }, 2000);
    }
});

document.getElementById('randomBeatBtn').addEventListener('click', () => {
    const n = Math.floor(Math.random() * 1000) + 1;
    document.getElementById('beatUrlInput').value = `http://dpi659qmb6hex.cloudfront.net/${n}.mp3`;
});

document.getElementById('beatMute').addEventListener('click', () => {
    const muted = beatPlayer.toggleMute();
    document.getElementById('beatMute').textContent = muted ? '🔇' : '🔊';
});

document.getElementById('nextOpponent').addEventListener('click', () => {
    resetBattle();
    peerConnection.sendBye();
});

// ── Voting ─────────────────────────────────────────────────────────────────
function submitVote(winner) {
    myVote = winner;
    document.querySelectorAll('.vote').forEach(b => b.disabled = true);
    voteHintEl.textContent = 'Your vote is in ✓ — waiting for opponent...';
    peerConnection.sendData({ type: 'VOTE', winner });
    if (theirVote !== null) handleResult();
}

document.getElementById('voteMe').addEventListener('click',  () => submitVote('me'));
document.getElementById('voteDraw').addEventListener('click', () => submitVote('draw'));
document.getElementById('voteOpp').addEventListener('click',  () => submitVote('opponent'));

window.addEventListener('beforeunload', () => {
    if (peerConnection.state === 'CONNECTED') peerConnection.sendBye();
});

saveScore();
