// 1. Select the elements
const statusText = document.getElementById("status-text");
const statusContainer = document.getElementById("ai-status");
const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");

// 2. UI Control Helpers
function lockUI() {
    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.5";
    sendBtn.style.cursor = "not-allowed";
    userInput.disabled = true; // Also lock input during transmission
}

function unlockUI() {
    sendBtn.disabled = false;
    sendBtn.style.opacity = "1";
    sendBtn.style.cursor = "pointer";
    userInput.disabled = false;
    userInput.focus();
}

function resetStatus() {
    if (statusText) statusText.innerText = "SYSTEM READY";
    if (statusContainer) statusContainer.classList.remove("is-typing");
}

// 3. The Main Chat Logic
async function handleChat() {
    const message = userInput.value.trim();
    if (!message) return;

    lockUI();
    appendMessage(message, "user-message");
    userInput.value = "";
    
    if (statusText) statusText.innerText = "TRANSMITTING...";
    if (statusContainer) statusContainer.classList.add("is-typing");

    try {
        const response = await fetch("http://127.0.0.1:3000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        if (response.ok) {
            if (statusText) statusText.innerText = "RECEIVING DATA...";
            appendMessage(data.reply, "bot-message", true);
        } else {
            // SPACE THEMED ERROR HANDLING
            let errorMsg = "Unknown Satellite Interference.";
            
            if (response.status === 429) {
                errorMsg = "📡 Satellite interference detected. Signal will be restored in 60 seconds. Please stand by.";
            } else if (data.error) {
                errorMsg = data.error;
            }

            appendMessage("⚠️ " + errorMsg, "bot-message");
            resetStatus();
            unlockUI();
        }

    } catch (error) {
        console.error("Connection Error:", error);
        appendMessage("📡 Transmission Lost. Ground control (Node server) is offline.", "bot-message");
        resetStatus();
        unlockUI();
    }
}

// 4. Message & Typewriter Logic
function appendMessage(text, className, isAI = false) {
    const msgDiv = document.createElement("div");
    msgDiv.className = className;
    msgDiv.style.whiteSpace = "pre-wrap"; 
    chatBox.appendChild(msgDiv);

    if (isAI) {
        typeWriter(text, msgDiv);
    } else {
        msgDiv.innerText = text;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function typeWriter(text, element) {
    let i = 0;
    element.innerHTML = ""; 
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            chatBox.scrollTop = chatBox.scrollHeight;
            setTimeout(type, 20);
        } else {
            resetStatus();
            unlockUI(); // Re-enable only after typing finishes
        }
    }
    type();
}

// 5. Event Listeners
sendBtn.addEventListener("click", handleChat);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !sendBtn.disabled) handleChat();
});

// 6. Clock Logic
function updateClock() {
    const now = new Date();
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    
    document.getElementById('clock-time').textContent = `${hours}:${minutes}:${seconds}`;
    document.getElementById('clock-date').textContent = now.toLocaleDateString('en-US', options);
}
setInterval(updateClock, 1000);
updateClock();