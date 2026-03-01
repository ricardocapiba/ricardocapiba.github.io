const STORAGE_KEY = "performa-commercial-v2";
const DEFAULT_PHOTO =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80";

const el = {
  loginForm: document.getElementById("login-form"),
  userSelect: document.getElementById("user-select"),
  sessionInfo: document.getElementById("session-info"),
  periodFilter: document.getElementById("period-filter"),
  dateFilter: document.getElementById("date-filter"),
  teamFilter: document.getElementById("team-filter"),
  statusFilter: document.getElementById("status-filter"),
  summaryKpis: document.getElementById("summary-kpis"),
  projectionForm: document.getElementById("projection-form"),
  projectionSales: document.getElementById("projection-sales"),
  projectionResult: document.getElementById("projection-result"),
  managerEntrySection: document.getElementById("manager-entry-section"),
  metricForm: document.getElementById("metric-form"),
  metricAgent: document.getElementById("metric-agent"),
  metricDate: document.getElementById("metric-date"),
  metricLeadsReceived: document.getElementById("metric-leads-received"),
  metricLeadsBase: document.getElementById("metric-leads-base"),
  metricDocs: document.getElementById("metric-docs"),
  metricSales: document.getElementById("metric-sales"),
  agentsGrid: document.getElementById("agents-grid"),
  teamForm: document.getElementById("team-form"),
  teamName: document.getElementById("team-name"),
  teamManager: document.getElementById("team-manager"),
  teamsList: document.getElementById("teams-list"),
  agentForm: document.getElementById("agent-form"),
  agentName: document.getElementById("agent-name"),
  agentPhoto: document.getElementById("agent-photo"),
  agentTeam: document.getElementById("agent-team"),
  agentsAdminBody: document.getElementById("agents-admin-body"),
};

let state = loadState();
let currentUserId = state.currentUserId;

if (!el.dateFilter.value) {
  el.dateFilter.value = dateISO(new Date());
}
if (!el.metricDate.value) {
  el.metricDate.value = dateISO(new Date());
}

bindEvents();
render();

function bindEvents() {
  el.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    currentUserId = el.userSelect.value;
    state.currentUserId = currentUserId;
    persist();
    render();
  });

  el.periodFilter.addEventListener("change", render);
  el.dateFilter.addEventListener("change", render);
  el.teamFilter.addEventListener("change", render);
  el.statusFilter.addEventListener("change", render);

  el.metricForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = currentUser();
    if (!user || user.role !== "manager") return;

    const payload = {
      id: id(),
      agentId: el.metricAgent.value,
      date: el.metricDate.value,
      leadsReceived: num(el.metricLeadsReceived.value),
      leadsBaseTotal: num(el.metricLeadsBase.value),
      docsReceived: num(el.metricDocs.value),
      sales: num(el.metricSales.value),
      createdBy: user.id,
    };

    if (!payload.agentId || !payload.date) return;

    state.metrics.push(payload);
    persist();
    el.metricForm.reset();
    el.metricDate.value = dateISO(new Date());
    render();
  });

  el.projectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const scope = collectScope();
    const totals = aggregateTotals(scope.metrics);
    const targetSales = Math.max(1, num(el.projectionSales.value));
    const docsPerSale = totals.sales ? totals.docsReceived / totals.sales : 0;
    const leadsPerDoc = totals.docsReceived ? totals.leadsBaseTotal / totals.docsReceived : 0;

    if (!docsPerSale || !leadsPerDoc) {
      el.projectionResult.textContent =
        "Ainda não há dados suficientes para projeção. Cadastre documentações e vendas.";
      return;
    }

    const docsNeeded = Math.ceil(targetSales * docsPerSale);
    const leadsNeeded = Math.ceil(docsNeeded * leadsPerDoc);

    el.projectionResult.textContent = `Para ${targetSales} vendas, a projeção indica aproximadamente ${docsNeeded} documentações e ${leadsNeeded} leads da base.`;
  });

  el.teamForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const team = {
      id: id(),
      name: el.teamName.value.trim(),
      managerId: el.teamManager.value,
    };
    if (!team.name || !team.managerId) return;

    state.teams.push(team);
    persist();
    el.teamForm.reset();
    render();
  });

  el.agentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const teamId = el.agentTeam.value;
    const newAgent = {
      id: id(),
      name: el.agentName.value.trim(),
      photo: el.agentPhoto.value.trim() || DEFAULT_PHOTO,
      active: true,
      currentTeamId: teamId,
      teamHistory: [{ teamId, startDate: dateISO(new Date()), endDate: null }],
    };
    if (!newAgent.name || !teamId) return;

    state.agents.push(newAgent);
    persist();
    el.agentForm.reset();
    render();
  });

  el.agentsAdminBody.addEventListener("click", (event) => {
    if (!isAdmin()) return;
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;

    const agent = state.agents.find((item) => item.id === actionButton.dataset.id);
    if (!agent) return;

    const action = actionButton.dataset.action;

    if (action === "toggle-status") {
      agent.active = !agent.active;
    }

    if (action === "move-team") {
      const nextTeam = prompt("Informe o ID da equipe destino:");
      if (!nextTeam || !state.teams.some((team) => team.id === nextTeam) || nextTeam === agent.currentTeamId) {
        return;
      }
      const activeHistory = agent.teamHistory.find((history) => history.endDate === null);
      if (activeHistory) activeHistory.endDate = dateISO(new Date());
      agent.currentTeamId = nextTeam;
      agent.teamHistory.push({ teamId: nextTeam, startDate: dateISO(new Date()), endDate: null });
    }

    persist();
    render();
  });
}

function render() {
  renderUserSelect();
  renderSession();
  renderFilters();
  renderManagerForm();
  renderSummary();
  renderAgents();
  renderAdminSections();
}

function renderUserSelect() {
  const selected = currentUserId;
  el.userSelect.innerHTML = "";
  for (const user of state.users) {
    const opt = document.createElement("option");
    opt.value = user.id;
    opt.textContent = `${user.name} (${user.role === "admin" ? "Gestor admin" : "Gerente"})`;
    el.userSelect.append(opt);
  }
  if (state.users.some((user) => user.id === selected)) {
    el.userSelect.value = selected;
  } else {
    currentUserId = state.users[0]?.id;
    state.currentUserId = currentUserId;
    persist();
  }
}

function renderSession() {
  const user = currentUser();
  if (!user) {
    el.sessionInfo.textContent = "Sem usuário ativo.";
    return;
  }

  const teamNames = user.role === "admin"
    ? "todas as equipes"
    : state.teams
        .filter((team) => team.managerId === user.id)
        .map((team) => team.name)
        .join(", ") || "sem equipe vinculada";

  el.sessionInfo.textContent = `${user.name} | ${user.role === "admin" ? "Gestor Admin" : "Gerente"} | Escopo: ${teamNames}.`;
}

function renderFilters() {
  const user = currentUser();
  const teamsInScope = getTeamsByUser(user);
  const selectedTeam = el.teamFilter.value;

  el.teamFilter.innerHTML = `<option value="all">Todas</option>`;
  for (const team of teamsInScope) {
    const opt = document.createElement("option");
    opt.value = team.id;
    opt.textContent = `${team.name} (${team.id})`;
    el.teamFilter.append(opt);
  }

  if (["all", ...teamsInScope.map((team) => team.id)].includes(selectedTeam)) {
    el.teamFilter.value = selectedTeam;
  }
}

function renderManagerForm() {
  const user = currentUser();
  const allowed = user && user.role === "manager";
  el.managerEntrySection.classList.toggle("hidden", !allowed);

  if (!allowed) return;

  const agents = collectScope().agents;
  const previous = el.metricAgent.value;

  el.metricAgent.innerHTML = "";
  for (const agent of agents) {
    const option = document.createElement("option");
    option.value = agent.id;
    option.textContent = `${agent.name} (${teamName(agent.currentTeamId)})`;
    el.metricAgent.append(option);
  }

  if (agents.some((item) => item.id === previous)) {
    el.metricAgent.value = previous;
  }
}

function renderSummary() {
  const scope = collectScope();
  const totals = aggregateTotals(scope.metrics);
  const teamAverage = scope.teams.length ? totals.sales / scope.teams.length : 0;

  const cards = [
    ["Leads recebidos", totals.leadsReceived],
    ["Leads totais da base", totals.leadsBaseTotal],
    ["Documentações", totals.docsReceived],
    ["Leads necessários por doc (base)", ratio(totals.leadsBaseTotal, totals.docsReceived)],
    ["Vendas", totals.sales],
    ["Docs necessários por venda", ratio(totals.docsReceived, totals.sales)],
    ["Média de vendas por equipe", teamAverage.toFixed(2)],
    ["Corretores no filtro", scope.agents.length],
  ];

  const template = document.getElementById("kpi-template");
  el.summaryKpis.innerHTML = "";

  for (const [title, value] of cards) {
    const node = template.content.cloneNode(true);
    node.querySelector("h3").textContent = title;
    node.querySelector("strong").textContent = String(value);
    el.summaryKpis.append(node);
  }
}

function renderAgents() {
  const scope = collectScope();
  if (!scope.agents.length) {
    el.agentsGrid.innerHTML = `<p class="empty">Nenhum corretor encontrado para os filtros selecionados.</p>`;
    return;
  }

  const byAgentId = groupMetricsByAgent(scope.metrics);

  el.agentsGrid.innerHTML = scope.agents
    .map((agent) => {
      const totals = aggregateTotals(byAgentId.get(agent.id) || []);
      return `
      <article class="agent-card ${agent.active ? "" : "inactive"}">
        <img src="${agent.photo}" alt="Foto de ${agent.name}" />
        <div>
          <h3>${agent.name}</h3>
          <p>${teamName(agent.currentTeamId)} | ${agent.active ? "Ativo" : "Desativado"}</p>
          <ul>
            <li>Leads recebidos: <strong>${totals.leadsReceived}</strong></li>
            <li>Leads totais base: <strong>${totals.leadsBaseTotal}</strong></li>
            <li>Documentações: <strong>${totals.docsReceived}</strong></li>
            <li>Leads por doc (base): <strong>${ratio(totals.leadsBaseTotal, totals.docsReceived)}</strong></li>
            <li>Vendas: <strong>${totals.sales}</strong></li>
            <li>Docs por venda: <strong>${ratio(totals.docsReceived, totals.sales)}</strong></li>
          </ul>
        </div>
      </article>`;
    })
    .join("");
}

function renderAdminSections() {
  const admin = isAdmin();
  document.querySelectorAll(".admin-only").forEach((node) => node.classList.toggle("hidden", !admin));
  if (!admin) return;

  const managers = state.users.filter((user) => user.role === "manager");
  const teamManagerPrev = el.teamManager.value;
  el.teamManager.innerHTML = "";
  for (const manager of managers) {
    const opt = document.createElement("option");
    opt.value = manager.id;
    opt.textContent = manager.name;
    el.teamManager.append(opt);
  }
  if (managers.some((manager) => manager.id === teamManagerPrev)) {
    el.teamManager.value = teamManagerPrev;
  }

  const teamPrev = el.agentTeam.value;
  el.agentTeam.innerHTML = "";
  for (const team of state.teams) {
    const opt = document.createElement("option");
    opt.value = team.id;
    opt.textContent = `${team.name} (${team.id})`;
    el.agentTeam.append(opt);
  }
  if (state.teams.some((team) => team.id === teamPrev)) {
    el.agentTeam.value = teamPrev;
  }

  el.teamsList.innerHTML = state.teams
    .map((team) => `<p><strong>${team.name}</strong> (${team.id}) — Gerente: ${userName(team.managerId)}</p>`)
    .join("");

  el.agentsAdminBody.innerHTML = state.agents
    .map(
      (agent) => `
      <tr>
        <td>${agent.name}</td>
        <td>${agent.active ? "Ativo" : "Desativado"}</td>
        <td>${teamName(agent.currentTeamId)} (${agent.currentTeamId})</td>
        <td class="actions">
          <button data-action="toggle-status" data-id="${agent.id}" type="button">${agent.active ? "Desativar" : "Ativar"}</button>
          <button data-action="move-team" data-id="${agent.id}" type="button">Mover equipe</button>
        </td>
      </tr>`,
    )
    .join("");
}

function collectScope() {
  const user = currentUser();
  if (!user) {
    return { teams: [], agents: [], metrics: [] };
  }

  const teams = getTeamsByUser(user);
  const selectedTeam = el.teamFilter.value;
  const teamIds = (selectedTeam && selectedTeam !== "all" ? [selectedTeam] : teams.map((team) => team.id));

  let agents = state.agents.filter((agent) => teamIds.includes(agent.currentTeamId));

  if (el.statusFilter.value === "active") {
    agents = agents.filter((agent) => agent.active);
  }
  if (el.statusFilter.value === "inactive") {
    agents = agents.filter((agent) => !agent.active);
  }

  const agentIds = new Set(agents.map((agent) => agent.id));
  const metrics = state.metrics.filter(
    (metric) => agentIds.has(metric.agentId) && isInPeriod(metric.date, el.periodFilter.value, el.dateFilter.value),
  );

  return { teams: teams.filter((team) => teamIds.includes(team.id)), agents, metrics };
}

function getTeamsByUser(user) {
  if (!user) return [];
  if (user.role === "admin") return [...state.teams];
  return state.teams.filter((team) => team.managerId === user.id);
}

function aggregateTotals(metrics) {
  return metrics.reduce(
    (acc, item) => {
      acc.leadsReceived += item.leadsReceived;
      acc.leadsBaseTotal += item.leadsBaseTotal;
      acc.docsReceived += item.docsReceived;
      acc.sales += item.sales;
      return acc;
    },
    { leadsReceived: 0, leadsBaseTotal: 0, docsReceived: 0, sales: 0 },
  );
}

function groupMetricsByAgent(metrics) {
  const map = new Map();
  for (const metric of metrics) {
    if (!map.has(metric.agentId)) map.set(metric.agentId, []);
    map.get(metric.agentId).push(metric);
  }
  return map;
}

function isInPeriod(dateString, period, refDateString) {
  if (period === "all") return true;
  const date = new Date(`${dateString}T12:00:00`);
  const ref = new Date(`${refDateString}T12:00:00`);

  if (period === "day") {
    return dateString === refDateString;
  }

  if (period === "month") {
    return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
  }

  if (period === "year") {
    return date.getFullYear() === ref.getFullYear();
  }

  if (period === "week") {
    const start = startOfWeek(ref);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return date >= start && date <= end;
  }

  return true;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  const admin = { id: id(), name: "Patrícia Admin", role: "admin" };
  const managerA = { id: id(), name: "Carlos Gerente", role: "manager" };
  const managerB = { id: id(), name: "Marina Gerente", role: "manager" };
  const teamA = { id: id(), name: "Equipe Norte", managerId: managerA.id };
  const teamB = { id: id(), name: "Equipe Sul", managerId: managerB.id };
  const agents = [
    { id: id(), name: "Ana Souza", photo: DEFAULT_PHOTO, active: true, currentTeamId: teamA.id, teamHistory: [{ teamId: teamA.id, startDate: dateISO(new Date()), endDate: null }] },
    { id: id(), name: "Bruno Lima", photo: DEFAULT_PHOTO, active: true, currentTeamId: teamA.id, teamHistory: [{ teamId: teamA.id, startDate: dateISO(new Date()), endDate: null }] },
    { id: id(), name: "Carla Nunes", photo: DEFAULT_PHOTO, active: false, currentTeamId: teamB.id, teamHistory: [{ teamId: teamB.id, startDate: dateISO(new Date()), endDate: null }] },
  ];

  return {
    users: [admin, managerA, managerB],
    teams: [teamA, teamB],
    agents,
    metrics: [],
    currentUserId: admin.id,
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ratio(numerator, denominator) {
  if (!denominator) return "0,00";
  return (numerator / denominator).toFixed(2).replace(".", ",");
}

function currentUser() {
  return state.users.find((user) => user.id === currentUserId);
}

function teamName(teamId) {
  return state.teams.find((team) => team.id === teamId)?.name || "Sem equipe";
}

function userName(userId) {
  return state.users.find((user) => user.id === userId)?.name || "N/A";
}

function isAdmin() {
  return currentUser()?.role === "admin";
}

function id() {
  return crypto.randomUUID();
}

function dateISO(date) {
  return date.toISOString().slice(0, 10);
}

function num(value) {
  return Number.parseFloat(value || 0) || 0;
}
