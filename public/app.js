const API_BASE = window.location.origin;
const state = { sessionId: null, pendingApproval: false };
const $ = (id) => document.getElementById(id);
const messages = $("messages");
const form = $("chatForm");
const input = $("message");
const sendButton = $("sendButton");

function createSessionId() {
  return crypto.randomUUID();
}

function setSession(sessionId) {
  state.sessionId = sessionId;
  $("sessionLabel").textContent = `Session ${sessionId.slice(0, 8)}`;
  $("sessionDescription").textContent = "Your conversation context is saved as you chat. Start a new conversation whenever you need a fresh context.";
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function addMessage(content, role = "assistant") {
  $("welcome")?.remove();
  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "✦";
    row.appendChild(avatar);
  }
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = escapeHtml(content).replace(/\n/g, "<br>");
  row.appendChild(bubble);
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

function showLoading() {
  const row = addMessage("Thinking", "assistant");
  row.querySelector(".message-bubble").classList.add("loading");
  $("agentStatus").textContent = "Working on your request";
  return row;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({ success: false, message: "Invalid server response" }));
  if (!response.ok || data.success === false) throw new Error(data.message || "Request failed");
  return data;
}

async function streamChatRequest(message, onToken, onApproval) {
  const response = await fetch(`${API_BASE}/api/assistant/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify({
      message,
      sessionId: state.sessionId
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Streaming request failed");
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventText of events) {
      const event = eventText.split("\n");
      const eventName = event.find(line => line.startsWith("event:"))?.slice(6).trim();
      const dataLine = event.find(line => line.startsWith("data:"))?.slice(5).trim();

      if (!eventName || !dataLine) continue;

      const data = JSON.parse(dataLine);

      if (eventName === "session") {
        setSession(data.sessionId);
      }

      if (eventName === "token") {
        onToken(data.content);
      }

      if (eventName === "approval") {
        onApproval(data);
      }

      if (eventName === "error") {
        throw new Error(data.message || "Streaming failed");
      }
    }
  }
}

async function sendChat(rawMessage) {
  const message = String(rawMessage || "").trim();
  if (!message || state.pendingApproval) return;

  addMessage(message, "user");

  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;

  const row = addMessage("", "assistant");
  const bubble = row.querySelector(".message-bubble");

  let fullResponse = "";
  let approvalReceived = false;

  $("agentStatus").textContent = "Working on your request";
  $("toolTrace").hidden = false;
  $("toolTraceText").textContent =
    "Astra is reasoning and selecting the right tools…";

  try {
    await streamChatRequest(
      message,

      // Receive each generated text chunk.
      (token) => {
        fullResponse += token;
        bubble.innerHTML = escapeHtml(fullResponse).replace(/\n/g, "<br>");
        messages.scrollTop = messages.scrollHeight;
      },

      // Handle approval-required actions.
      (data) => {
        approvalReceived = true;
        state.pendingApproval = true;
        row.remove();

        showApproval(data);
        $("agentStatus").textContent = "Waiting for your approval";
      }
    );

    if (!approvalReceived) {
      if (!fullResponse) {
        bubble.textContent = "Done.";
      }

      $("agentStatus").textContent = "Ready when you are";
    }
  } catch (error) {
    if (!fullResponse) {
      row.remove();
      addMessage(
        error.message || "Something went wrong.",
        "assistant"
      );
    } else {
      bubble.innerHTML =
        escapeHtml(fullResponse + "\n\n[Connection interrupted]");
    }

    $("agentStatus").textContent = "Request failed";
  } finally {
    sendButton.disabled = false;
    $("toolTrace").hidden = true;
    input.focus();
  }
}

function showApproval(data) {
  const area = $("approvalArea");
  area.innerHTML = "";
  const approval = data.approvals?.[0] || {};
  const card = document.createElement("div");
  card.className = "approval-card";
  const details = [
    approval.to ? `<p><b>To:</b> ${escapeHtml(approval.to)}<br><b>Subject:</b> ${escapeHtml(approval.subject || "")}</p>` : "",
    approval.messageId ? `<p><b>Message ID:</b> ${escapeHtml(approval.messageId)}</p>` : "",
  ].join("");
  card.innerHTML = `
    <strong>Approval required</strong>
    <p>${escapeHtml(data.response || "A tool is requesting permission to perform an action.")}</p>
    ${details}
    <div class="approval-actions">
      <button type="button" class="approve-btn">Approve</button>
      <button type="button" class="reject-btn">Reject</button>
    </div>`;
  card.querySelector(".approve-btn").addEventListener("click", () => resumeApproval(true));
  card.querySelector(".reject-btn").addEventListener("click", () => resumeApproval(false));
  area.appendChild(card);
}

async function resumeApproval(approved) {
  const buttons = $("approvalArea").querySelectorAll("button");
  buttons.forEach((button) => button.disabled = true);
  const loading = showLoading();
  try {
    const data = await api("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ sessionId: state.sessionId, approved }),
    });
    loading.remove();
    $("approvalArea").innerHTML = "";
    state.pendingApproval = Boolean(data.approvalRequired);
    if (data.approvalRequired) {
      showApproval(data);
    } else {
      addMessage(data.response || (approved ? "The action was approved." : "The action was rejected."), "assistant");
      $("agentStatus").textContent = "Ready when you are";
    }
  } catch (error) {
    loading.remove();
    buttons.forEach((button) => button.disabled = false);
    addMessage(error.message || "Unable to process the approval.", "assistant");
  }
}

function startNewConversation() {
  state.pendingApproval = false;
  $("approvalArea").innerHTML = "";
  messages.innerHTML = "";
  messages.appendChild(createWelcome());
  setSession(createSessionId());
  $("agentStatus").textContent = "New conversation ready";
  input.value = "";
  input.focus();
}

function createWelcome() {
  const wrapper = document.createElement("div");
  wrapper.className = "welcome";
  wrapper.id = "welcome";
  wrapper.innerHTML = `
    <div class="welcome-icon">✦</div>
    <p class="eyebrow">YOUR PERSONAL AI ASSISTANT</p>
    <h1>What can I help<br><span>you with today?</span></h1>
    <p class="welcome-copy">Ask a question, explore an idea, or tell me what you need done.</p>
    <div class="prompt-grid">
      <button class="prompt-card" data-prompt="Find the latest developments in AI agents and summarize the most important updates."><span class="prompt-icon purple">⌕</span><span><strong>Research something</strong><small>Find and summarize the latest information</small></span><span class="prompt-arrow">↗</span></button>
      <button class="prompt-card" data-prompt="Help me organize and summarize my important emails."><span class="prompt-icon blue">✉</span><span><strong>Manage my email</strong><small>Find, summarize, and organize messages</small></span><span class="prompt-arrow">↗</span></button>
      <button class="prompt-card" data-prompt="Review my GitHub activity and help me identify what needs attention."><span class="prompt-icon green">⌘</span><span><strong>Explore my code</strong><small>Review repositories and development activity</small></span><span class="prompt-arrow">↗</span></button>
      <button class="prompt-card" data-prompt="Help me understand and query my PostgreSQL database."><span class="prompt-icon amber">▤</span><span><strong>Work with data</strong><small>Query and understand structured data</small></span><span class="prompt-arrow">↗</span></button>
    </div>`;
  wrapper.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => sendChat(button.dataset.prompt)));
  return wrapper;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendChat(input.value);
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
});
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendChat(button.dataset.prompt));
});
$("newChat").addEventListener("click", startNewConversation);
$("newChatTop").addEventListener("click", startNewConversation);
$("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));

setSession(createSessionId());
