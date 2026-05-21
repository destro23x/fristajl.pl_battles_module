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

// ── Timer ──────────────────────────────────────────────────────────────────
function startTimer(seconds, onEnd) {
    clearInterval(timerInterval);
    let remaining = seconds;
    renderTimer(remaining, seconds);
    timerInterval = setInterval(() => {
        remaining--;
        renderTimer(remaining, seconds);
        if (remaining <= 0) { clearInterval(timerInterval); onEnd(); }
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
    topicEl.textContent = '—';
    setBeatDisplay(null);
    document.querySelectorAll('.vote').forEach(b => b.disabled = false);
    voteHintEl.textContent = 'Cast your vote above';
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

            case 'BATTLE_START':
                topicEl.textContent = msg.topic;
                roundDuration = msg.duration;
                setBeatDisplay(msg.beat);
                if (msg.beatUrl) {
                    beatPlayer.playUrl(msg.beatUrl);
                } else {
                    beatPlayer.play(msg.beat);
                }
                chat.addServerMessage(`🎤 Topic: "${msg.topic}" · Beat: ${msg.beat} — Opponent raps first!`);
                setState('THEIR_TURN');
                break;

            case 'TURN_SWITCH':
                chat.addServerMessage(`🎤 Your turn! Topic: "${topicEl.textContent}"`);
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
            if (myRole === 'SECOND') chat.addServerMessage("⏳ Waiting for opponent to start the battle...");
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
    const topic    = TOPICS[Math.floor(Math.random() * TOPICS.length)];
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
    topicEl.textContent = topic;
    setBeatDisplay(beat);
    peerConnection.sendData({ type: 'BATTLE_START', topic, beat, beatUrl, duration: roundDuration });
    chat.addServerMessage(`🎤 Topic: "${topic}" · Beat: ${beat} — Your turn first! Rap!`);
    setState('MY_TURN');
    startTimer(roundDuration, () => {
        peerConnection.sendData({ type: 'TURN_SWITCH' });
        stopTimer();
        setState('THEIR_TURN');
        chat.addServerMessage("⏱ Your time's up! Opponent's turn now.");
    });
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
