const STORAGE_KEY = "performa-metrics-v1";

const form = document.getElementById("metric-form");
const recordsBody = document.getElementById("records-body");
const kpiGrid = document.getElementById("kpi-grid");
const agentFilter = document.getElementById("agent-filter");
const monthFilter = document.getElementById("month-filter");
const clearFiltersBtn = document.getElementById("clear-filters");

const fields = {
  agent: document.getElementById("agent"),
  date: document.getElementById("date"),
  leads: document.getElementById("leads"),
  contacts: document.getElementById("contacts"),
  visits: document.getElementById("visits"),
  proposals: document.getElementById("proposals"),
  sales: document.getElementById("sales"),
  vgv: document.getElementById("vgv"),
};

const kpis = [
  { key: "leads", label: "Leads" },
  { key: "contacts", label: "Contatos" },
  { key: "visits", label: "Visitas" },
  { key: "proposals", label: "Propostas" },
  { key: "sales", label: "Vendas" },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let records = loadRecords();

if (!fields.date.value) {
  fields.date.valueAsDate = new Date();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const record = {
    id: crypto.randomUUID(),
    agent: fields.agent.value.trim(),
    date: fields.date.value,
    leads: numberValue(fields.leads.value),
    contacts: numberValue(fields.contacts.value),
    visits: numberValue(fields.visits.value),
    proposals: numberValue(fields.proposals.value),
    sales: numberValue(fields.sales.value),
    vgv: numberValue(fields.vgv.value),
  };

  if (!record.agent || !record.date) return;

  records.push(record);
  persist();
  refresh();
  form.reset();
  fields.date.valueAsDate = new Date();
  fields.agent.focus();
});

agentFilter.addEventListener("change", refresh);
monthFilter.addEventListener("change", refresh);
clearFiltersBtn.addEventListener("click", () => {
  agentFilter.value = "todos";
  monthFilter.value = "";
  refresh();
});

recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;

  records = records.filter((record) => record.id !== button.dataset.id);
  persist();
  refresh();
});

function loadRecords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function numberValue(value) {
  return Number.parseFloat(value || 0) || 0;
}

function filteredRecords() {
  return records.filter((record) => {
    const byAgent =
      agentFilter.value === "todos" || record.agent === agentFilter.value;
    const byMonth =
      !monthFilter.value || record.date.startsWith(monthFilter.value);

    return byAgent && byMonth;
  });
}

function computeTotals(data) {
  const total = data.reduce(
    (acc, item) => {
      acc.leads += item.leads;
      acc.contacts += item.contacts;
      acc.visits += item.visits;
      acc.proposals += item.proposals;
      acc.sales += item.sales;
      acc.vgv += item.vgv;
      return acc;
    },
    { leads: 0, contacts: 0, visits: 0, proposals: 0, sales: 0, vgv: 0 },
  );

  const contactRate = percentage(total.contacts, total.leads);
  const visitRate = percentage(total.visits, total.contacts);
  const proposalRate = percentage(total.proposals, total.visits);
  const closeRate = percentage(total.sales, total.proposals);

  return { ...total, contactRate, visitRate, proposalRate, closeRate };
}

function percentage(part, whole) {
  if (!whole) return "0,0%";
  return `${((part / whole) * 100).toFixed(1).replace(".", ",")}%`;
}

function refreshAgentFilter() {
  const selected = agentFilter.value;
  const agents = [...new Set(records.map((item) => item.agent))].sort();
  agentFilter.innerHTML = `<option value="todos">Todos</option>`;

  for (const agent of agents) {
    const option = document.createElement("option");
    option.value = agent;
    option.textContent = agent;
    agentFilter.append(option);
  }

  if (["todos", ...agents].includes(selected)) {
    agentFilter.value = selected;
  }
}

function renderKPIs(totals) {
  const items = [
    ...kpis.map((kpi) => ({ label: kpi.label, value: totals[kpi.key] })),
    { label: "VGV", value: currency.format(totals.vgv) },
    { label: "Tx. contato/leads", value: totals.contactRate },
    { label: "Tx. visita/contatos", value: totals.visitRate },
    { label: "Tx. proposta/visitas", value: totals.proposalRate },
    { label: "Tx. fechamento", value: totals.closeRate },
  ];

  const template = document.getElementById("kpi-card-template");
  kpiGrid.innerHTML = "";

  for (const item of items) {
    const node = template.content.cloneNode(true);
    node.querySelector("h3").textContent = item.label;
    node.querySelector("strong").textContent =
      typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value;
    kpiGrid.append(node);
  }
}

function renderTable(data) {
  recordsBody.innerHTML = "";

  if (!data.length) {
    recordsBody.innerHTML = `<tr><td class="empty" colspan="9">Nenhum registro encontrado.</td></tr>`;
    return;
  }

  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
  for (const record of sorted) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(`${record.date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
      <td>${record.agent}</td>
      <td>${record.leads}</td>
      <td>${record.contacts}</td>
      <td>${record.visits}</td>
      <td>${record.proposals}</td>
      <td>${record.sales}</td>
      <td>${currency.format(record.vgv)}</td>
      <td><button type="button" class="remove-btn" data-id="${record.id}">Excluir</button></td>
    `;

    recordsBody.append(row);
  }
}

function refresh() {
  refreshAgentFilter();
  const data = filteredRecords();
  const totals = computeTotals(data);
  renderKPIs(totals);
  renderTable(data);
}

refresh();
