// --- MISSION CONFIGURATION ---
// Load existing missions from LocalStorage or start with an empty array
let missions = JSON.parse(localStorage.getItem('satellite_data')) || [];
let currentSessionId = missions.length > 0 ? missions[0].id : null;

// DOM Elements
const chatBox = document.getElementById('chat-box');
const sessionList = document.getElementById('session-list');
const newChatBtn = document.getElementById('new-chat-btn');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.getElementById('status-text');
const aiStatusContainer = document.getElementById('ai-status');

// --- INITIALIZATION ---
window.onload = () => {
    if (missions.length > 0) {
        // Resume the most recent mission
        const lastMission = missions[0];
        currentSessionId = lastMission.id;
        chatBox.innerHTML = lastMission.history;
        
        // The "Unique Twist" Greeting
        const welcomeBackMsg = `<div class="system-msg">--- CONNECTION RESTORED: COMMANDER ---<br>Resuming ${lastMission.title}. Last contact: ${lastMission.lastTopic}</div>`;
        chatBox.innerHTML += welcomeBackMsg;
    } else {
        createNewMission();
    }
    updateSidebar();
    setInterval(updateClock, 1000);
    updateClock();
};

// --- MISSION MANAGEMENT ---
function createNewMission() {
    currentSessionId = "Mission_" + Date.now();
    const newMission = {
        id: currentSessionId,
        title: "New Transmission",
        lastTopic: "None",
        history: `<div class="system-msg">--- TERMINAL ACTIVE: READY FOR TRANSMISSION ---</div>`
    };
    missions.unshift(newMission);
    saveToDisk();
    chatBox.innerHTML = newMission.history;
    updateSidebar();
}

newChatBtn.addEventListener('click', createNewMission);

// --- TRANSMISSION LOGIC ---
async function transmitMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // 1. Display User Command
    chatBox.innerHTML += `<div class="user-message"><b>COMMAND:</b> ${message}</div>`;
    userInput.value = '';
    scrollToBottom();

    // 2. UI Feedback
    statusText.innerText = "TRANSMITTING...";
    aiStatusContainer.classList.add('is-typing');

    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: message, 
                sessionId: currentSessionId 
            })
        });

        const data = await response.json();
        
        // 3. Display AI Response
        chatBox.innerHTML += `<div class="bot-message"><b>SATELLITE:</b> ${data.reply}</div>`;

        // 4. PERSISTENCE LOGIC: Save to the correct mission object
        const activeMission = missions.find(m => m.id === currentSessionId);
        if (activeMission) {
            activeMission.history = chatBox.innerHTML;
            // If server sends a topic/summary, update it here
            if(data.topic) activeMission.title = data.topic; 
            if(data.lastTopic) activeMission.lastTopic = data.lastTopic;
        }
        saveToDisk();
        updateSidebar();

    } catch (error) {
        chatBox.innerHTML += `<div class="bot-message" style="color: #ff4444;"><b>ERROR:</b> Satellite Link Lost. Check Server Status.</div>`;
    } finally {
        statusText.innerText = "SYSTEM READY";
        aiStatusContainer.classList.remove('is-typing');
        scrollToBottom();
    }
}

// --- SIDEBAR & DISK LOGIC ---
function updateSidebar() {
    sessionList.innerHTML = ''; 
    missions.forEach(m => {
        const div = document.createElement('div');
        div.className = `session-item ${m.id === currentSessionId ? 'active-session' : ''}`;
        
        // Space-themed UI for sidebar items
        div.innerHTML = `
            <div style="font-weight: bold;">${m.title}</div>
            <div style="font-size: 10px; opacity: 0.5;">ID: ${m.id}</div>
        `;
        
        div.onclick = () => {
            // Save current before switching
            currentSessionId = m.id;
            chatBox.innerHTML = m.history;
            updateSidebar();
            scrollToBottom();
        };
        sessionList.appendChild(div);
    });
}

function saveToDisk() {
    // Keep only last 10 missions to avoid storage limits
    if (missions.length > 10) missions = missions.slice(0, 10);
    localStorage.setItem('satellite_data', JSON.stringify(missions));
}

// --- UTILITIES ---
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock-time').innerText = now.toLocaleTimeString('en-GB', { hour12: false });
    document.getElementById('clock-date').innerText = now.toLocaleDateString('en-GB', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }).toUpperCase();
}

sendBtn.addEventListener('click', transmitMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') transmitMessage(); });