const STORAGE_KEY = "performa-beta-v1";
const DEFAULT_PHOTO = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80";

const $ = (id) => document.getElementById(id);
const el = {
  loginForm: $("login-form"),
  userSelect: $("user-select"),
  periodFilter: $("period-filter"),
  dateFilter: $("date-filter"),
  teamFilter: $("team-filter"),
  statusFilter: $("status-filter"),
  kpiGrid: $("kpi-grid"),
  managerSection: $("manager-section"),
  metricForm: $("metric-form"),
  metricAgent: $("metric-agent"),
  metricDate: $("metric-date"),
  metricLeads: $("metric-leads"),
  metricBase: $("metric-base"),
  metricDocs: $("metric-docs"),
  metricSales: $("metric-sales"),
  agentsGrid: $("agents-grid"),
  adminSection: $("admin-section"),
  teamForm: $("team-form"),
  teamName: $("team-name"),
  teamManager: $("team-manager"),
  agentForm: $("agent-form"),
  agentName: $("agent-name"),
  agentPhoto: $("agent-photo"),
  agentTeam: $("agent-team"),
  adminAgentsBody: $("admin-agents-body"),
};

let state = loadState();
let currentUserId = state.currentUserId;
el.dateFilter.value = dateISO(new Date());
el.metricDate.value = dateISO(new Date());

bindEvents();
render();

function bindEvents() {
  el.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    currentUserId = el.userSelect.value;
    state.currentUserId = currentUserId;
    persist();
    render();
  });

  [el.periodFilter, el.dateFilter, el.teamFilter, el.statusFilter].forEach((node) =>
    node.addEventListener("change", render),
  );

  el.metricForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isManager()) return;
    state.metrics.push({
      id: id(),
      agentId: el.metricAgent.value,
      date: el.metricDate.value,
      leadsReceived: num(el.metricLeads.value),
      leadsBase: num(el.metricBase.value),
      docs: num(el.metricDocs.value),
      sales: num(el.metricSales.value),
    });
    persist();
    el.metricForm.reset();
    el.metricDate.value = dateISO(new Date());
    render();
  });

  el.teamForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    state.teams.push({ id: id(), name: el.teamName.value.trim(), managerId: el.teamManager.value });
    persist();
    el.teamForm.reset();
    render();
  });

  el.agentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    const teamId = el.agentTeam.value;
    state.agents.push({
      id: id(),
      name: el.agentName.value.trim(),
      photo: el.agentPhoto.value.trim() || DEFAULT_PHOTO,
      active: true,
      currentTeamId: teamId,
      teamHistory: [{ teamId, startDate: dateISO(new Date()), endDate: null }],
    });
    persist();
    el.agentForm.reset();
    render();
  });

  el.adminAgentsBody.addEventListener("click", (e) => {
    if (!isAdmin()) return;
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const agent = state.agents.find((a) => a.id === btn.dataset.id);
    if (!agent) return;

    if (btn.dataset.action === "toggle") {
      agent.active = !agent.active;
    }
    if (btn.dataset.action === "move") {
      const nextTeamId = prompt("ID da equipe destino:");
      if (!nextTeamId || nextTeamId === agent.currentTeamId || !state.teams.some((t) => t.id === nextTeamId)) return;
      const open = agent.teamHistory.find((h) => h.endDate === null);
      if (open) open.endDate = dateISO(new Date());
      agent.currentTeamId = nextTeamId;
      agent.teamHistory.push({ teamId: nextTeamId, startDate: dateISO(new Date()), endDate: null });
    }
    persist();
    render();
  });
}

function render() {
  renderUserSelect();
  renderFilters();
  renderMetricAgentSelect();
  renderKPIs();
  renderAgents();
  renderAdmin();

  el.managerSection.classList.toggle("hidden", !isManager());
  el.adminSection.classList.toggle("hidden", !isAdmin());
}

function renderUserSelect() {
  const prev = el.userSelect.value || currentUserId;
  el.userSelect.innerHTML = state.users
    .map((u) => `<option value="${u.id}">${u.name} (${u.role === "admin" ? "Gestor admin" : "Gerente"})</option>`)
    .join("");
  el.userSelect.value = state.users.some((u) => u.id === prev) ? prev : state.users[0].id;
  currentUserId = el.userSelect.value;
}

function renderFilters() {
  const scopeTeams = teamsInScope();
  const selected = el.teamFilter.value;
  el.teamFilter.innerHTML = `<option value="all">Todas</option>${scopeTeams
    .map((t) => `<option value="${t.id}">${t.name}</option>`)
    .join("")}`;
  if (["all", ...scopeTeams.map((t) => t.id)].includes(selected)) el.teamFilter.value = selected;
}

function renderMetricAgentSelect() {
  const prev = el.metricAgent.value;
  const agents = collectScope().agents;
  el.metricAgent.innerHTML = agents.map((a) => `<option value="${a.id}">${a.name}</option>`).join("");
  if (agents.some((a) => a.id === prev)) el.metricAgent.value = prev;
}

function renderKPIs() {
  const t = aggregate(collectScope().metrics);
  const rows = [
    ["Leads recebidos", t.leadsReceived],
    ["Leads totais da base", t.leadsBase],
    ["Documentações", t.docs],
    ["Leads por documentação (base/docs)", ratio(t.leadsBase, t.docs)],
    ["Vendas", t.sales],
    ["Docs por venda", ratio(t.docs, t.sales)],
  ];
  const template = $("kpi-template");
  el.kpiGrid.innerHTML = "";
  for (const [label, value] of rows) {
    const node = template.content.cloneNode(true);
    node.querySelector("h3").textContent = label;
    node.querySelector("strong").textContent = String(value);
    el.kpiGrid.append(node);
  }
}

function renderAgents() {
  const { agents, metrics } = collectScope();
  const grouped = new Map();
  for (const m of metrics) {
    if (!grouped.has(m.agentId)) grouped.set(m.agentId, []);
    grouped.get(m.agentId).push(m);
  }
  if (!agents.length) {
    el.agentsGrid.innerHTML = `<p class="empty">Nenhum corretor no filtro.</p>`;
    return;
  }
  el.agentsGrid.innerHTML = agents
    .map((a) => {
      const t = aggregate(grouped.get(a.id) || []);
      return `<article class="agent-card ${a.active ? "" : "inactive"}">
        <img src="${a.photo}" alt="${a.name}" />
        <div>
          <h3>${a.name}</h3>
          <p>${teamName(a.currentTeamId)} • ${a.active ? "Ativo" : "Desativado"}</p>
          <ul>
            <li>Leads recebidos: <strong>${t.leadsReceived}</strong></li>
            <li>Leads base: <strong>${t.leadsBase}</strong></li>
            <li>Docs: <strong>${t.docs}</strong></li>
            <li>Leads por doc: <strong>${ratio(t.leadsBase, t.docs)}</strong></li>
            <li>Vendas: <strong>${t.sales}</strong></li>
            <li>Docs por venda: <strong>${ratio(t.docs, t.sales)}</strong></li>
          </ul>
        </div>
      </article>`;
    })
    .join("");
}

function renderAdmin() {
  if (!isAdmin()) return;
  const managers = state.users.filter((u) => u.role === "manager");
  const teams = state.teams;
  el.teamManager.innerHTML = managers.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
  el.agentTeam.innerHTML = teams.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
  el.adminAgentsBody.innerHTML = state.agents
    .map(
      (a) => `<tr>
      <td>${a.name}</td>
      <td>${a.active ? "Ativo" : "Desativado"}</td>
      <td>${teamName(a.currentTeamId)}</td>
      <td class="actions">
        <button type="button" data-action="toggle" data-id="${a.id}">${a.active ? "Desativar" : "Ativar"}</button>
        <button type="button" data-action="move" data-id="${a.id}">Mover</button>
      </td>
    </tr>`,
    )
    .join("");
}

function collectScope() {
  const teams = teamsInScope();
  const teamId = el.teamFilter.value;
  const teamIds = teamId && teamId !== "all" ? [teamId] : teams.map((t) => t.id);

  let agents = state.agents.filter((a) => teamIds.includes(a.currentTeamId));
  if (el.statusFilter.value === "active") agents = agents.filter((a) => a.active);
  if (el.statusFilter.value === "inactive") agents = agents.filter((a) => !a.active);

  const agentSet = new Set(agents.map((a) => a.id));
  const metrics = state.metrics.filter((m) => agentSet.has(m.agentId) && inPeriod(m.date));
  return { agents, metrics };
}

function teamsInScope() {
  if (isAdmin()) return [...state.teams];
  return state.teams.filter((t) => t.managerId === currentUserId);
}

function inPeriod(dateISOText) {
  const p = el.periodFilter.value;
  if (p === "all") return true;
  const ref = new Date(`${el.dateFilter.value}T12:00:00`);
  const d = new Date(`${dateISOText}T12:00:00`);
  if (p === "day") return dateISOText === el.dateFilter.value;
  if (p === "month") return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  if (p === "year") return d.getFullYear() === ref.getFullYear();
  const start = startOfWeek(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return d >= start && d <= end;
}

function startOfWeek(date) {
  const x = new Date(date);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - day + 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function aggregate(items) {
  return items.reduce(
    (acc, m) => {
      acc.leadsReceived += m.leadsReceived;
      acc.leadsBase += m.leadsBase;
      acc.docs += m.docs;
      acc.sales += m.sales;
      return acc;
    },
    { leadsReceived: 0, leadsBase: 0, docs: 0, sales: 0 },
  );
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const admin = { id: id(), name: "Patrícia", role: "admin" };
  const manager1 = { id: id(), name: "Carlos", role: "manager" };
  const manager2 = { id: id(), name: "Marina", role: "manager" };
  const team1 = { id: id(), name: "Equipe Norte", managerId: manager1.id };
  const team2 = { id: id(), name: "Equipe Sul", managerId: manager2.id };
  const agent1 = { id: id(), name: "Ana Souza", photo: DEFAULT_PHOTO, active: true, currentTeamId: team1.id, teamHistory: [{ teamId: team1.id, startDate: dateISO(new Date()), endDate: null }] };
  const agent2 = { id: id(), name: "Bruno Lima", photo: DEFAULT_PHOTO, active: true, currentTeamId: team1.id, teamHistory: [{ teamId: team1.id, startDate: dateISO(new Date()), endDate: null }] };
  const agent3 = { id: id(), name: "Carla Nunes", photo: DEFAULT_PHOTO, active: false, currentTeamId: team2.id, teamHistory: [{ teamId: team2.id, startDate: dateISO(new Date()), endDate: null }] };

  return { users: [admin, manager1, manager2], teams: [team1, team2], agents: [agent1, agent2, agent3], metrics: [], currentUserId: admin.id };
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentUser() { return state.users.find((u) => u.id === currentUserId); }
function isAdmin() { return currentUser()?.role === "admin"; }
function isManager() { return currentUser()?.role === "manager"; }
function teamName(idValue) { return state.teams.find((t) => t.id === idValue)?.name || "Sem equipe"; }
function ratio(a, b) { return b ? (a / b).toFixed(2).replace(".", ",") : "0,00"; }
function num(v) { return Number.parseFloat(v || 0) || 0; }
function dateISO(d) { return d.toISOString().slice(0, 10); }
function id() { return crypto.randomUUID(); }
