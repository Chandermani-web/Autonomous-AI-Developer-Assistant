const API_BASE = location.origin;
const state = { sessionId: null, soundEnabled: true, voiceMode: false, recognition: null, recognizing: false };
const $ = (id) => document.getElementById(id);
const messages = $("messages");
const form = $("chatForm");
const input = $("message");
const sendButton = $("sendButton");
const micButton = $("micButton");

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function addMessage(content, role = "assistant") {
  messages.querySelector(".welcome")?.remove();
  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "A";
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

async function sendChat(message) {
  if (!message?.trim()) return;
  addMessage(message, "user");
  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;
  micButton.disabled = true;
  const loading = showLoading();
  $("toolTrace").hidden = false;
  $("toolTrace").textContent = "Assistant is reasoning across connected tools...";
  try {
    const data = await api("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ message, sessionId: state.sessionId }),
    });
    loading.remove();
    state.sessionId = data.sessionId;
    if (data.approvalRequired) showApproval(data);
    else {
      addMessage(data.response || "Done.", "assistant");
      speakIfEnabled(data.response);
      refreshSessions();
    }
  } catch (error) {
    loading.remove();
    addMessage(error.message, "assistant");
  } finally {
    sendButton.disabled = false;
    micButton.disabled = false;
    $("toolTrace").hidden = true;
  }
}

function showApproval(data) {
  const area = $("approvalArea");
  area.innerHTML = "";
  const approval = data.approvals?.[0] || {};
  const card = document.createElement("div");
  card.className = "approval-card";
  card.innerHTML = `
    <strong>Approval required</strong>
    <p>${escapeHtml(data.response)}</p>
    ${approval.to ? `<p><b>To:</b> ${escapeHtml(approval.to)}<br><b>Subject:</b> ${escapeHtml(approval.subject)}</p>` : ""}
    <div class="approval-actions">
      <button type="button" class="approve-btn">Approve</button>
      <button type="button" class="reject-btn">Reject</button>
    </div>`;
  card.querySelector(".approve-btn").addEventListener("click", () => resumeApproval(true));
  card.querySelector(".reject-btn").addEventListener("click", () => resumeApproval(false));
  area.appendChild(card);
}

async function resumeApproval(approved) {
  $("approvalArea").innerHTML = "";
  const loading = showLoading();
  try {
    const data = await api("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ sessionId: state.sessionId, approved }),
    });
    loading.remove();
    if (data.approvalRequired) showApproval(data);
    else {
      addMessage(data.response || (approved ? "Approved action completed." : "Action rejected."), "assistant");
      speakIfEnabled(data.response);
      refreshDashboard();
    }
  } catch (error) {
    loading.remove();
    addMessage(error.message, "assistant");
  }
}

form.addEventListener("submit", (event) => { event.preventDefault(); sendChat(input.value); });
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 120)}px`; });
document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => sendChat(button.dataset.prompt)));
$("newChat").addEventListener("click", () => {
  state.sessionId = null;
  messages.innerHTML = "";
  $("approvalArea").innerHTML = "";
  addMessage("New conversation started. What would you like to work on?", "assistant");
});
$("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("refreshDashboard").addEventListener("click", refreshDashboard);

async function refreshDashboard() {
  $("agentStatus").textContent = "Refreshing integrations";
  try {
    const { data } = await api("/api/dashboard/overview");
    renderGmail(data.gmail);
    renderGithub(data.github);
    renderPostgres(data.postgres);
    renderQueues(data.queues);
    renderSessions(data.sessions);
    const unavailable = [data.gmail, data.github, data.postgres, data.queues].filter((item) => item.status !== "connected").length;
    $("agentStatus").textContent = unavailable ? `${unavailable} integration needs attention` : "All integrations ready";
  } catch (error) {
    $("agentStatus").textContent = "Dashboard unavailable";
  }
}

function setStatus(id, status) { $(id).textContent = status; }

function renderGmail(gmail) {
  setStatus("gmailStatus", gmail.status === "connected" ? "Connected" : gmail.status === "not_configured" ? "Not configured" : "Unavailable");
  $("gmailUnread").textContent = gmail.unread ?? "—";
  if (!gmail.recent?.length) {
    $("emailList").innerHTML = `<p class="error-state">${escapeHtml(gmail.error || (gmail.status === "not_configured" ? "Add Google OAuth credentials and a refresh token." : "No inbox messages available."))}</p>`;
    return;
  }
  $("emailList").innerHTML = gmail.recent.map((email) =>
    `<div class="email-item ${email.unread ? "unread" : ""}"><strong>${escapeHtml(email.subject)}</strong><span>${escapeHtml(email.from)} · ${escapeHtml(email.snippet)}</span></div>`).join("");
}

function renderGithub(github) {
  setStatus("githubStatus", github.status === "connected" ? `Connected · ${github.user?.login || "GitHub"}` : github.status === "not_configured" ? "Not configured" : "Unavailable");
  if (!github.repositories?.length) {
    $("repoList").innerHTML = `<p class="error-state">${escapeHtml(github.error || "No repositories available.")}</p>`;
    return;
  }
  $("repoList").innerHTML = github.repositories.map((repo) =>
    `<a class="repo-item" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><strong>${escapeHtml(repo.name)}</strong><span>${escapeHtml(repo.description || "No description")}</span><div class="repo-meta"><b>★ ${repo.stars}</b><b>⑂ ${repo.forks}</b><b>! ${repo.openIssues}</b><b>⑊ ${repo.openPullRequests}</b></div></a>`).join("");
}

function renderPostgres(postgres) {
  setStatus("postgresStatus", postgres.status === "connected" ? "Connected" : "Unavailable");
  if (postgres.status !== "connected") {
    $("databaseSummary").innerHTML = `<p class="error-state">${escapeHtml(postgres.error || "PostgreSQL is unavailable.")}</p>`;
    return;
  }
  $("databaseSummary").innerHTML = `
    <div class="db-row"><span>Database</span><strong>${escapeHtml(postgres.database)}</strong></div>
    <div class="db-row"><span>Databases</span><strong>${postgres.databases.length}</strong></div>
    <div class="db-row"><span>Tables</span><strong>${postgres.tables.length}</strong></div>
    <div class="db-row"><span>Host</span><strong>${escapeHtml(postgres.host)}</strong></div>`;
}

function renderQueues(queues) {
  setStatus("queueStatus", queues.status === "connected" ? "Workers reachable" : "Unavailable");
  if (queues.status !== "connected") {
    $("jobSummary").innerHTML = `<p class="error-state">${escapeHtml(queues.error || "Queues unavailable.")}</p>`;
    return;
  }
  $("jobSummary").innerHTML = ["send", "delete"].map((name) => {
    const counts = queues[name] || {};
    return `<div class="job-row"><strong>${name === "send" ? "Send email" : "Delete email"}</strong><div class="job-counts"><span>Active ${counts.active || 0}</span><span>Waiting ${counts.waiting || 0}</span><span>Failed ${counts.failed || 0}</span></div></div>`;
  }).join("");
}

async function refreshSessions() {
  try { const { data } = await api("/api/assistant/sessions"); renderSessions(data); } catch (_) {}
}

function renderSessions(sessionData) {
  const history = $("history");
  history.querySelectorAll(".history-item").forEach((item) => item.remove());
  (sessionData?.sessions || []).slice(0, 12).forEach((session) => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.textContent = `Conversation ${session.id.slice(0, 8)}`;
    button.addEventListener("click", () => {
      state.sessionId = session.id;
      document.querySelectorAll(".history-item").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      messages.innerHTML = "";
      addMessage("Conversation restored.", "assistant");
    });
    history.appendChild(button);
  });
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  state.recognition = new SpeechRecognition();
  state.recognition.continuous = false;
  state.recognition.interimResults = true;
  state.recognition.lang = "en-US";
  state.recognition.onstart = () => { state.recognizing = true; micButton.classList.add("listening"); $("voiceStatus").textContent = "Listening..."; };
  state.recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      else interimText += event.results[i][0].transcript;
    }
    input.value = finalText || interimText;
    if (!$("voiceOverlay").hidden) $("voiceTranscript").textContent = finalText || interimText || "Listening...";
  };
  state.recognition.onend = () => {
    state.recognizing = false;
    micButton.classList.remove("listening");
    $("voiceStatus").textContent = state.voiceMode ? "Voice mode" : "Text mode";
    if (input.value.trim() && state.voiceMode) sendChat(input.value);
  };
  state.recognition.onerror = (event) => { $("voiceStatus").textContent = `Voice unavailable: ${event.error}`; };
} else {
  micButton.addEventListener("click", () => { $("voiceStatus").textContent = "Speech recognition is not supported by this browser"; });
}

function startListening() {
  if (!state.recognition) return;
  if (state.recognizing) state.recognition.stop();
  else state.recognition.start();
}

micButton.addEventListener("click", startListening);

function speakIfEnabled(text) {
  if (!state.soundEnabled || !("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, " "));
  utterance.rate = 1;
  utterance.onstart = () => $("voiceOrb").classList.add("speaking");
  utterance.onend = () => {
    $("voiceOrb").classList.remove("speaking");
    if (state.voiceMode) setTimeout(startListening, 350);
  };
  window.speechSynthesis.speak(utterance);
}

$("soundToggle").addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  $("soundToggle").textContent = state.soundEnabled ? "Speaker on" : "Speaker off";
  if (!state.soundEnabled) window.speechSynthesis?.cancel();
});
$("voiceMode").addEventListener("click", () => {
  state.voiceMode = true;
  $("voiceOverlay").hidden = false;
  $("voiceOrb").className = "voice-orb listening";
  $("voiceTitle").textContent = "Listening";
  startListening();
});
$("closeVoice").addEventListener("click", () => {
  state.voiceMode = false;
  $("voiceOverlay").hidden = true;
  if (state.recognizing) state.recognition.stop();
  window.speechSynthesis?.cancel();
});

refreshDashboard();
refreshSessions();
