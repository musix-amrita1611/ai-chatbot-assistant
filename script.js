// --- MISSION CONFIGURATION ---
let currentSessionId = "Mission_" + Date.now();
let savedSessions = [currentSessionId];

// DOM Elements
const chatBox = document.getElementById('chat-box');
const sessionList = document.getElementById('session-list');
const newChatBtn = document.getElementById('new-chat-btn');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.getElementById('status-text');
const aiStatusContainer = document.getElementById('ai-status');

// --- NEW CHAT (NEW MISSION) ---
newChatBtn.addEventListener('click', () => {
    // Generate a fresh unique ID
    currentSessionId = "Mission_" + Date.now();
    savedSessions.unshift(currentSessionId); // Add new mission to the top of the list
    
    // Clear Visuals with a system message
    chatBox.innerHTML = `<div class="system-msg">--- NEW FREQUENCY ESTABLISHED: ${currentSessionId} ---</div>`;
    
    updateSidebar();
});

// --- TRANSMISSION LOGIC ---
async function transmitMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // 1. Display User Command
    chatBox.innerHTML += `<div class="user-message"><b>COMMAND:</b> ${message}</div>`;
    userInput.value = '';
    scrollToBottom();

    // 2. Trigger AI "Typing" Animation
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

    } catch (error) {
        chatBox.innerHTML += `<div class="bot-message" style="color: #ff4444;"><b>ERROR:</b> Satellite Link Lost. Check Server Status.</div>`;
    } finally {
        // 4. Reset Status
        statusText.innerText = "SYSTEM READY";
        aiStatusContainer.classList.remove('is-typing');
        scrollToBottom();
    }
}

// --- SIDEBAR & HISTORY LOGIC ---
function updateSidebar() {
    sessionList.innerHTML = ''; // Clear current sidebar
    
    savedSessions.forEach(id => {
        const div = document.createElement('div');
        // Apply active class if this is the currently selected mission
        div.className = `session-item ${id === currentSessionId ? 'active-session' : ''}`;
        div.innerText = id;
        
        div.onclick = () => {
            currentSessionId = id;
            chatBox.innerHTML = `<div class="system-msg">--- SWITCHED TO MISSION: ${id} ---</div>`;
            updateSidebar();
        };
        
        sessionList.appendChild(div);
    });
}

// --- UTILITY FUNCTIONS ---
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Digital Clock Updater
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateStr = now.toLocaleDateString('en-GB', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    document.getElementById('clock-time').innerText = timeStr;
    document.getElementById('clock-date').innerText = dateStr.toUpperCase();
}

// --- INITIALIZATION ---
// Event Listeners
sendBtn.addEventListener('click', transmitMessage);
userInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') transmitMessage(); 
});

// Start background processes
updateSidebar();
setInterval(updateClock, 1000);
updateClock();

// Initial System Message
chatBox.innerHTML = `<div class="system-msg">--- TERMINAL ACTIVE: READY FOR TRANSMISSION ---</div>`;