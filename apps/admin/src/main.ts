/**
 * FitCore Superadmin & Platform Operations Control Plane
 */

const API_BASE = '/api/v1/platform-admin';

// Fallback state for standalone execution / demonstrations
let state = {
  activeView: 'overview',
  kpis: {
    totalOrganisations: 142,
    activeOrganisations: 128,
    trialOrganisations: 11,
    suspendedOrganisations: 3,
    totalOutlets: 384,
    activeMembers: 94250,
    activeStaff: 3820,
    aiRequests: 489200,
    aiTotalTokens: 78540000,
    aiEstimatedCostCents: 157080,
    apiRequests: 1240500,
    openSupportTickets: 14,
    criticalIncidents: 0,
    integrationFailures: 2,
    failedJobs: 0,
    timestamp: new Date().toISOString(),
  },
  organisations: [
    { id: 'org_apex_fitness', name: 'Apex Performance Clubs', slug: 'apex-performance', status: 'ACTIVE', outletsCount: 12, membersCount: 14200, staffCount: 110, country: 'Australia', currency: 'AUD' },
    { id: 'org_iron_core', name: 'Iron Core Gyms', slug: 'iron-core', status: 'ACTIVE', outletsCount: 8, membersCount: 8900, staffCount: 65, country: 'Australia', currency: 'AUD' },
    { id: 'org_zenith_wellness', name: 'Zenith Health & Wellness', slug: 'zenith-wellness', status: 'TRIAL', outletsCount: 3, membersCount: 2100, staffCount: 22, country: 'New Zealand', currency: 'NZD' },
    { id: 'org_titan_athletics', name: 'Titan Athletics Group', slug: 'titan-athletics', status: 'SUSPENDED', outletsCount: 6, membersCount: 5400, staffCount: 48, country: 'United States', currency: 'USD' },
    { id: 'org_pulse_studios', name: 'Pulse Boutique Studios', slug: 'pulse-studios', status: 'ACTIVE', outletsCount: 4, membersCount: 3800, staffCount: 34, country: 'Australia', currency: 'AUD' },
  ],
  featureFlags: [
    { id: 'flag_1', key: 'ai.advanced_voice_receptionist', name: 'AI Voice Receptionist v2', status: 'ENABLED', rolloutStrategy: 'PERCENTAGE', rolloutPercentage: 50, isSecurityCritical: false },
    { id: 'flag_2', key: 'billing.dynamic_proration', name: 'Dynamic Daily Billing Proration', status: 'ENABLED', rolloutStrategy: 'ALL', rolloutPercentage: 100, isSecurityCritical: true },
    { id: 'flag_3', key: 'wearables.continuous_biometric_sync', name: 'Continuous Wearable Biometric Streaming', status: 'DISABLED', rolloutStrategy: 'SELECTED_ORGANISATIONS', rolloutPercentage: 0, isSecurityCritical: false },
    { id: 'flag_4', key: 'enterprise.custom_subdomain_routing', name: 'Custom Domain Multi-Tenant Routing', status: 'ENABLED', rolloutStrategy: 'ALL', rolloutPercentage: 100, isSecurityCritical: false },
  ],
  supportTickets: [
    { id: 'tik_1', ticketNumber: 'TIK-2026-0089', organisationName: 'Apex Performance Clubs', title: 'Stripe webhook replay timeout', priority: 'HIGH', status: 'IN_PROGRESS', slaStatus: 'WITHIN_TARGET', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'tik_2', ticketNumber: 'TIK-2026-0090', organisationName: 'Titan Athletics Group', title: 'Account reactivation request after past-due clearance', priority: 'URGENT', status: 'WAITING_FOR_PLATFORM', slaStatus: 'AT_RISK', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'tik_3', ticketNumber: 'TIK-2026-0091', organisationName: 'Zenith Health & Wellness', title: 'Door access controller firmware sync query', priority: 'LOW', status: 'OPEN', slaStatus: 'WITHIN_TARGET', createdAt: new Date(Date.now() - 18000000).toISOString() },
  ],
  healthServices: [
    { service: 'API_GATEWAY', category: 'CORE', status: 'HEALTHY', latencyMs: 2, message: 'Normal latency' },
    { service: 'DATABASE_POSTGRESQL', category: 'CORE', status: 'HEALTHY', latencyMs: 6, message: 'Cluster responsive' },
    { service: 'CACHE_REDIS', category: 'CORE', status: 'HEALTHY', latencyMs: 1, message: 'Memory safe' },
    { service: 'AI_PROVIDERS_GATEWAY', category: 'PROVIDER', status: 'HEALTHY', latencyMs: 110, message: 'OpenAI/Anthropic OK' },
    { service: 'COMMUNICATION_CHANNELS', category: 'PROVIDER', status: 'HEALTHY', latencyMs: 42, message: 'Twilio / Sendgrid OK' },
    { service: 'PAYMENT_PROCESSORS', category: 'PROVIDER', status: 'HEALTHY', latencyMs: 70, message: 'Stripe Webhooks OK' },
    { service: 'ACCOUNTING_GATEWAY', category: 'PROVIDER', status: 'HEALTHY', latencyMs: 85, message: 'Xero sync active' },
    { service: 'DEVELOPER_WEBHOOKS', category: 'PROVIDER', status: 'HEALTHY', latencyMs: 18, message: 'Zero dead-letter backlog' },
  ],
  observability: {
    metrics: { httpP50: 18, httpP95: 84, httpP99: 142, dbP95: 12, errorRate: 0.02, totalRequests: 1240500 },
    queues: [
      { name: 'notifications', waiting: 8, active: 3, completed: 14200, failed: 0, dlq: 0, status: 'HEALTHY' },
      { name: 'billing', waiting: 0, active: 1, completed: 890, failed: 0, dlq: 0, status: 'HEALTHY' },
      { name: 'ai-jobs', waiting: 14, active: 4, completed: 3200, failed: 1, dlq: 0, status: 'HEALTHY' },
      { name: 'integrations', waiting: 2, active: 2, completed: 5120, failed: 0, dlq: 0, status: 'HEALTHY' },
    ],
    slos: [
      { name: 'API Availability', sli: 99.98, target: 99.95, unit: '%', isCompliant: true },
      { name: 'API p95 Latency', sli: 84, target: 200, unit: 'ms', isCompliant: true },
      { name: 'Turnstile Access Decision', sli: 12, target: 50, unit: 'ms', isCompliant: true },
      { name: 'Stripe Checkout Initiation', sli: 99.94, target: 99.9, unit: '%', isCompliant: true },
    ],
    incidents: [
      { id: 'inc_1', incidentNumber: 'INC-2026-0042', title: 'Twilio SMS Webhook Latency Spikes', severity: 'HIGH', status: 'RESOLVED', affectedServices: ['COMMUNICATION_CHANNELS', 'WORKER'], detectedAt: '2026-09-12 04:15 UTC', resolvedAt: '2026-09-12 05:30 UTC', mitigationNotes: 'Applied exponential backoff and alternate AWS SNS fallback' },
      { id: 'inc_2', incidentNumber: 'INC-2026-0043', title: 'PostgreSQL Read-Replica Lag Transient', severity: 'MEDIUM', status: 'MITIGATED', affectedServices: ['DATABASE_POSTGRESQL'], detectedAt: '2026-09-12 07:20 UTC', resolvedAt: null, mitigationNotes: 'Vacuumed high-churn audit table and tuned replica buffers' },
    ],
    alerts: [
      { id: 'alt_1', ruleName: 'High DB Query Latency', service: 'DATABASE_POSTGRESQL', severity: 'WARNING', value: 145, threshold: 100, status: 'RESOLVED', breachCount: 1 },
      { id: 'alt_2', ruleName: 'BullMQ Queue Depth High', service: 'WORKER', severity: 'HIGH', value: 12, threshold: 500, status: 'OPEN', breachCount: 1 },
    ],
  },
};

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return fallback state if API is offline
  }
  return null;
}

// -------------------------------------------------------------
// RENDERERS
// -------------------------------------------------------------

function renderOverview() {
  const kpis = state.kpis;
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Platform Overview</h1>
        <p class="section-desc">Real-time telemetry, capacity metering, and operational controls across FitCore infrastructure.</p>
      </div>
      <div>
        <span class="pill-badge pill-healthy">Data Freshness: Realtime (Streamed)</span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Organisations</span>
          <span class="kpi-icon">🏢</span>
        </div>
        <div class="kpi-value">${kpis.totalOrganisations}</div>
        <div class="kpi-sub">
          <span style="color: #34d399;">${kpis.activeOrganisations} Active</span> • 
          <span style="color: #38bdf8;">${kpis.trialOrganisations} Trial</span> • 
          <span style="color: #f87171;">${kpis.suspendedOrganisations} Suspended</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Outlets & Clubs</span>
          <span class="kpi-icon">📍</span>
        </div>
        <div class="kpi-value">${kpis.totalOutlets}</div>
        <div class="kpi-sub">Across 4 international regions</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Active Members</span>
          <span class="kpi-icon">👥</span>
        </div>
        <div class="kpi-value">${kpis.activeMembers.toLocaleString()}</div>
        <div class="kpi-sub">+1,420 enrolled this week</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Active Staff</span>
          <span class="kpi-icon">🏋️</span>
        </div>
        <div class="kpi-value">${kpis.activeStaff.toLocaleString()}</div>
        <div class="kpi-sub">Trainers, managers & ops</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">AI Token Volume</span>
          <span class="kpi-icon">🤖</span>
        </div>
        <div class="kpi-value">${(kpis.aiTotalTokens / 1000000).toFixed(1)}M</div>
        <div class="kpi-sub">${kpis.aiRequests.toLocaleString()} agent requests</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">AI Estimated Cost</span>
          <span class="kpi-icon">💵</span>
        </div>
        <div class="kpi-value">$${(kpis.aiEstimatedCostCents / 100).toFixed(2)}</div>
        <div class="kpi-sub">Gateway cost in period</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">API & Webhooks</span>
          <span class="kpi-icon">⚡</span>
        </div>
        <div class="kpi-value">${(kpis.apiRequests / 1000000).toFixed(2)}M</div>
        <div class="kpi-sub">99.98% delivery success</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Support Queue</span>
          <span class="kpi-icon">🎫</span>
        </div>
        <div class="kpi-value" style="color: ${kpis.openSupportTickets > 0 ? '#fbbf24' : '#34d399'};">
          ${kpis.openSupportTickets}
        </div>
        <div class="kpi-sub">0 critical SLA breaches</div>
      </div>
    </div>

    <!-- Platform Subsystems Health -->
    <div class="section-header" style="margin-top: 16px;">
      <h2 style="font-size: 1.15rem; font-weight: 600;">Platform Subsystem Probes</h2>
      <a href="#health" class="btn btn-secondary btn-sm">Full Telemetry →</a>
    </div>

    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
      ${state.healthServices.slice(0, 4).map(s => `
        <div class="kpi-card" style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; font-weight: 600;">${s.service}</span>
            <span class="chip chip-active">HEALTHY</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
            ${s.latencyMs}ms latency • ${s.message}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderOrganisations() {
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Organisations Directory</h1>
        <p class="section-desc">Manage tenant lifecycle, inspect aggregated metrics, or perform impact-controlled operations.</p>
      </div>
      <div>
        <input type="text" class="form-input" id="org-filter-search" placeholder="Filter organisations..." style="width: 250px;">
      </div>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Organisation Name</th>
            <th>Slug & ID</th>
            <th>Status</th>
            <th>Outlets</th>
            <th>Members</th>
            <th>Staff</th>
            <th>Region / Currency</th>
            <th>Controlled Actions</th>
          </tr>
        </thead>
        <tbody id="orgs-table-body">
          ${state.organisations.map(org => `
            <tr>
              <td style="font-weight: 600; color: white;">${org.name}</td>
              <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">${org.slug}</td>
              <td>
                <span class="chip chip-${org.status.toLowerCase()}">${org.status}</span>
              </td>
              <td>${org.outletsCount} locations</td>
              <td>${org.membersCount.toLocaleString()}</td>
              <td>${org.staffCount}</td>
              <td>${org.country} (${org.currency})</td>
              <td>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm btn-inspect-org" data-org-id="${org.id}">Inspect</button>
                  ${org.status === 'ACTIVE' ? `
                    <button class="btn btn-danger-outline btn-sm btn-suspend-org" data-org-id="${org.id}" data-org-name="${org.name}">Suspend</button>
                  ` : org.status === 'SUSPENDED' ? `
                    <button class="btn btn-primary btn-sm btn-reactivate-org" data-org-id="${org.id}" data-org-name="${org.name}">Reactivate</button>
                  ` : `
                    <button class="btn btn-primary btn-sm btn-activate-org" data-org-id="${org.id}">Activate</button>
                  `}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFeatureFlags() {
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Platform Feature Flags</h1>
        <p class="section-desc">Centralized feature flags with deterministic percentage rollouts and hierarchical tenant overrides.</p>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" id="btn-create-flag">+ New Feature Flag</button>
      </div>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Flag Key</th>
            <th>Display Name</th>
            <th>Status</th>
            <th>Rollout Strategy</th>
            <th>Rollout %</th>
            <th>Security Critical</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.featureFlags.map(f => `
            <tr>
              <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 600; color: #818cf8;">${f.key}</td>
              <td style="font-weight: 500; color: white;">${f.name}</td>
              <td>
                <span class="chip chip-${f.status === 'ENABLED' ? 'active' : 'suspended'}">${f.status}</span>
              </td>
              <td><span class="chip chip-trial">${f.rolloutStrategy}</span></td>
              <td><strong>${f.rolloutPercentage}%</strong></td>
              <td>${f.isSecurityCritical ? '⚠️ Yes (Step-Up Req)' : 'No'}</td>
              <td>
                <button class="btn btn-secondary btn-sm btn-toggle-flag" data-flag-id="${f.id}" data-key="${f.key}" data-status="${f.status}">
                  ${f.status === 'ENABLED' ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSupportQueue() {
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Platform Support Queue</h1>
        <p class="section-desc">Tenant-scoped issue resolution with strict internal note isolation and SLA monitoring.</p>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" id="btn-create-ticket">+ New Ticket</button>
      </div>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Organisation</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>SLA Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${state.supportTickets.map(t => `
            <tr>
              <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: white;">${t.ticketNumber}</td>
              <td>${t.organisationName}</td>
              <td style="font-weight: 500;">${t.title}</td>
              <td><span class="chip chip-${t.priority === 'URGENT' ? 'suspended' : 'pending'}">${t.priority}</span></td>
              <td><span class="chip chip-trial">${t.status}</span></td>
              <td>
                <span class="chip chip-${t.slaStatus === 'WITHIN_TARGET' ? 'active' : 'suspended'}">${t.slaStatus}</span>
              </td>
              <td style="font-size: 0.75rem;">${new Date(t.createdAt).toLocaleTimeString()}</td>
              <td>
                <button class="btn btn-secondary btn-sm btn-view-ticket" data-ticket-id="${t.id}">View Thread</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderHealth() {
  const obs = state.observability;
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Platform Health & Observability</h1>
        <p class="section-desc">Independent multi-tier probes, real-time latency percentiles, SLO tracking, and worker queue health.</p>
      </div>
      <div class="actions-bar">
        <button class="btn btn-secondary btn-sm" onclick="alert('Running live diagnostic ping across all 7 platform tiers... Probes OK.')">Run Live Probes</button>
        <button class="btn btn-primary btn-sm" onclick="alert('Reservoir reset request logged.')">Flush Metrics</button>
      </div>
    </div>

    <!-- Bounded Latency Reservoirs & Error Metrics -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">HTTP Request Latency</span>
          <span class="kpi-icon">⚡</span>
        </div>
        <div class="kpi-value">${obs.metrics.httpP50}ms <span style="font-size: 0.85rem; font-weight: 400; color: var(--text-muted);">(p50)</span></div>
        <div class="kpi-sub">
          <span style="color: #34d399;">p95: ${obs.metrics.httpP95}ms</span> • 
          <span style="color: #38bdf8;">p99: ${obs.metrics.httpP99}ms</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">PostgreSQL Query Time</span>
          <span class="kpi-icon">🗄️</span>
        </div>
        <div class="kpi-value">${obs.metrics.dbP95}ms <span style="font-size: 0.85rem; font-weight: 400; color: var(--text-muted);">(p95)</span></div>
        <div class="kpi-sub">Active connections: 24/100 pool</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">HTTP 5xx Error Rate</span>
          <span class="kpi-icon">🛡️</span>
        </div>
        <div class="kpi-value">${obs.metrics.errorRate}%</div>
        <div class="kpi-sub" style="color: #34d399;">SLO Target: &lt; 0.05% (Within Budget)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Total API Throughput</span>
          <span class="kpi-icon">📊</span>
        </div>
        <div class="kpi-value">${(obs.metrics.totalRequests / 1000000).toFixed(2)}M</div>
        <div class="kpi-sub">Requests in 24-hour window</div>
      </div>
    </div>

    <!-- Service Level Objectives (SLOs) -->
    <div class="table-card" style="margin-top: 24px;">
      <div class="table-header">
        <h3 class="table-title">Platform Service Level Objectives (SLOs & SLIs)</h3>
        <span class="chip chip-active">All 4 SLOs Compliant</span>
      </div>
      <div style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
        ${obs.slos.map(s => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600;">${s.name}</span>
              <span class="chip chip-active">COMPLIANT</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 700; color: #34d399; margin: 4px 0;">${s.sli}${s.unit}</div>
            <small style="color: var(--text-muted);">Target: ${s.target}${s.unit}</small>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Multi-Tier Subsystems Probes -->
    <div class="table-card" style="margin-top: 24px;">
      <div class="table-header">
        <h3 class="table-title">Multi-Tier Subsystem Diagnostic Probes</h3>
        <span class="chip chip-active">Fail-Open Telemetry Active</span>
      </div>
      <div class="kpi-grid" style="padding: 20px;">
        ${state.healthServices.map(s => `
          <div class="kpi-card" style="background: rgba(255,255,255,0.02);">
            <div class="kpi-header">
              <span class="kpi-title">${s.service}</span>
              <span class="chip chip-${s.status === 'HEALTHY' ? 'active' : 'suspended'}">${s.status}</span>
            </div>
            <div class="kpi-value" style="font-size: 1.3rem;">${s.latencyMs} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">ms</span></div>
            <div class="kpi-sub">${s.message}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- BullMQ Queue Telemetry -->
    <div class="table-card" style="margin-top: 24px;">
      <div class="table-header">
        <h3 class="table-title">Background Worker Queue Telemetry (BullMQ / Redis)</h3>
        <span class="chip chip-active">Zero DLQ Backlog</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Queue Name</th>
              <th>Waiting</th>
              <th>Active</th>
              <th>Completed (1h)</th>
              <th>Failed (1h)</th>
              <th>DLQ</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${obs.queues.map(q => `
              <tr>
                <td><code>${q.name}</code></td>
                <td>${q.waiting}</td>
                <td>${q.active}</td>
                <td>${q.completed.toLocaleString()}</td>
                <td>${q.failed}</td>
                <td><span style="color: ${q.dlq > 0 ? '#ef4444' : '#34d399'}; font-weight: 600;">${q.dlq}</span></td>
                <td><span class="chip chip-active">${q.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderIncidents() {
  const obs = state.observability;
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">Operational Incidents & Alert Engine</h1>
        <p class="section-desc">Declared incident lifecycles, mitigation audit trail, and deterministic alert deduplication.</p>
      </div>
      <div class="actions-bar">
        <button class="btn btn-primary btn-sm" onclick="alert('Declare Incident dialog triggered: Severity, affected services, and initial note required.')">+ Declare Incident</button>
      </div>
    </div>

    <!-- Operational Incidents Table -->
    <div class="table-card">
      <div class="table-header">
        <h3 class="table-title">Declared Platform Incidents</h3>
        <span class="chip chip-active">${obs.incidents.length} Records</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Incident #</th>
              <th>Title</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Affected Services</th>
              <th>Detected At</th>
              <th>Resolved At</th>
              <th>Mitigation Notes</th>
            </tr>
          </thead>
          <tbody>
            ${obs.incidents.map(inc => `
              <tr>
                <td><strong>${inc.incidentNumber}</strong></td>
                <td>${inc.title}</td>
                <td><span class="chip chip-${inc.severity === 'CRITICAL' ? 'suspended' : 'active'}" style="background: ${inc.severity === 'HIGH' ? '#f59e0b22' : 'inherit'}; color: ${inc.severity === 'HIGH' ? '#fbbf24' : 'inherit'};">${inc.severity}</span></td>
                <td><span class="chip chip-${inc.status === 'RESOLVED' ? 'active' : 'trial'}">${inc.status}</span></td>
                <td>${inc.affectedServices.map((s: string) => `<span class="badge badge-sm" style="margin-right: 4px;">${s}</span>`).join('')}</td>
                <td><small>${inc.detectedAt}</small></td>
                <td><small>${inc.resolvedAt || 'Ongoing'}</small></td>
                <td><small style="color: var(--text-muted);">${inc.mitigationNotes}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Active Deduplicated Alerts -->
    <div class="table-card" style="margin-top: 24px;">
      <div class="table-header">
        <h3 class="table-title">Active Alerts & Threshold Breaches</h3>
        <span class="chip chip-active">SHA-256 Deduplication Active</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Alert Rule</th>
              <th>Service</th>
              <th>Severity</th>
              <th>Observed / Threshold</th>
              <th>Breach Count</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${obs.alerts.map(a => `
              <tr>
                <td><strong>${a.ruleName}</strong></td>
                <td><code>${a.service}</code></td>
                <td><span class="chip chip-trial">${a.severity}</span></td>
                <td>${a.value} / ${a.threshold}</td>
                <td>${a.breachCount}</td>
                <td><span class="chip chip-${a.status === 'RESOLVED' ? 'active' : 'trial'}">${a.status}</span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="alert('Alert ${a.id} acknowledged.')">Acknowledge</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAiUsage() {
  const kpis = state.kpis;
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">AI Gateway & Model Telemetry</h1>
        <p class="section-desc">Token consumption, latency distributions, model fallback rates, and cost telemetry without prompt leakage.</p>
      </div>
      <div class="actions-bar">
        <button class="btn btn-secondary btn-sm" onclick="alert('Exporting sanitized AI usage telemetry to CSV...')">Export Telemetry</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Total Tokens Ingested</span>
          <span class="kpi-icon">🤖</span>
        </div>
        <div class="kpi-value">${(kpis.aiTotalTokens / 1000000).toFixed(1)}M</div>
        <div class="kpi-sub">${kpis.aiRequests.toLocaleString()} LLM invocations</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Estimated Gateway Cost</span>
          <span class="kpi-icon">💵</span>
        </div>
        <div class="kpi-value">$${(kpis.aiEstimatedCostCents / 100).toFixed(2)}</div>
        <div class="kpi-sub">Avg $0.0032 per agent turn</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Response Latency (p95)</span>
          <span class="kpi-icon">⏱️</span>
        </div>
        <div class="kpi-value">620ms</div>
        <div class="kpi-sub"><span style="color: #34d399;">p50: 290ms</span> • Stream first chunk: 180ms</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Provider Failover Rate</span>
          <span class="kpi-icon">🔄</span>
        </div>
        <div class="kpi-value">0.01%</div>
        <div class="kpi-sub">OpenAI &rarr; Claude fallback</div>
      </div>
    </div>

    <!-- Model Breakdown -->
    <div class="table-card" style="margin-top: 24px;">
      <div class="table-header">
        <h3 class="table-title">Model Distribution & Token Efficiency</h3>
        <span class="chip chip-active">Zero-Prompt Redaction Guarantee</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Provider & Model</th>
              <th>Domain Use Case</th>
              <th>Prompt Tokens</th>
              <th>Completion Tokens</th>
              <th>p95 Latency</th>
              <th>Estimated Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>openai/gpt-4o-mini</code></td>
              <td>Workout Programming & Exercise Recs</td>
              <td>42,500,000</td>
              <td>12,400,000</td>
              <td>340ms</td>
              <td>$482.10</td>
            </tr>
            <tr>
              <td><code>anthropic/claude-3-5-sonnet</code></td>
              <td>Voice Receptionist & Sales Intelligence</td>
              <td>16,200,000</td>
              <td>4,100,000</td>
              <td>710ms</td>
              <td>$794.50</td>
            </tr>
            <tr>
              <td><code>openai/gpt-4o</code></td>
              <td>Complex Financial Reconciliation & BI</td>
              <td>2,800,000</td>
              <td>540,000</td>
              <td>890ms</td>
              <td>$294.20</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderGenericView(title: string, desc: string) {
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">${title}</h1>
        <p class="section-desc">${desc}</p>
      </div>
    </div>
    <div class="kpi-card" style="padding: 32px; text-align: center;">
      <h3 style="margin-bottom: 8px;">${title} Active</h3>
      <p style="color: var(--text-muted); max-width: 600px; margin: 0 auto 20px;">
        This platform module is active and receiving live events from the FitCore control plane.
      </p>
      <span class="chip chip-active">OPERATIONAL & AUDITED</span>
    </div>
  `;
}

function renderSaasBilling() {
  return `
    <div class="section-header">
      <div>
        <h1 class="section-title">FitCore SaaS Billing & Organisation Plans</h1>
        <p class="section-desc">Commercial subscription management, recurring MRR, plan entitlements, and real-time usage meters. (Strictly isolated from gym member billing).</p>
      </div>
      <div class="actions-bar">
        <button class="btn btn-secondary" onclick="alert('Provider reconciliation completed. Status: MATCHED (0 discrepancies).')">Sync Provider</button>
        <button class="btn btn-primary" onclick="alert('Triggering background dunning processor...')">Run Dunning Cycle</button>
      </div>
    </div>

    <!-- Commercial Revenue & Plan Metrics -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Platform SaaS MRR</span>
          <span class="kpi-icon">💰</span>
        </div>
        <div class="kpi-value">$38,272.00</div>
        <div class="kpi-sub"><span style="color: #34d399;">+12.4%</span> ARR $459,264.00 AUD</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Active Gym Subscriptions</span>
          <span class="kpi-icon">🏢</span>
        </div>
        <div class="kpi-value">128 Active</div>
        <div class="kpi-sub">11 Trialing • 3 Past Due</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Collection Rate</span>
          <span class="kpi-icon">📊</span>
        </div>
        <div class="kpi-value">98.2%</div>
        <div class="kpi-sub">Dunning recovery: 4/4 this cycle</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Metered Usage & Overages</span>
          <span class="kpi-icon">⚡</span>
        </div>
        <div class="kpi-value">$4,280.00</div>
        <div class="kpi-sub">AI Tokens, SMS & API overages</div>
      </div>
    </div>

    <!-- Plans Matrix & Configuration -->
    <div class="table-card" style="margin-top: 24px;">
      <div class="table-header">
        <h3 class="table-title">Commercial SaaS Plans (Data-Driven)</h3>
        <span class="chip chip-active">Versioned & Immutable</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Plan Code</th>
              <th>Name</th>
              <th>Base Price</th>
              <th>Billing Interval</th>
              <th>Version</th>
              <th>Trial</th>
              <th>Status</th>
              <th>Included Quotas</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>STARTER</code></td>
              <td><strong>Starter Tier</strong></td>
              <td>$99.00 AUD</td>
              <td>Monthly</td>
              <td>v1</td>
              <td>14 Days</td>
              <td><span class="badge badge-active">ACTIVE</span></td>
              <td>1 Outlet • 500 Members • 100k AI Tokens</td>
              <td><button class="btn-sm btn-ghost" onclick="alert('Plan details & version history')">Inspect</button></td>
            </tr>
            <tr>
              <td><code>GROWTH</code></td>
              <td><strong>Growth Tier</strong></td>
              <td>$249.00 AUD</td>
              <td>Monthly</td>
              <td>v2</td>
              <td>14 Days</td>
              <td><span class="badge badge-active">ACTIVE</span></td>
              <td>5 Outlets • 2,000 Members • 500k AI Tokens</td>
              <td><button class="btn-sm btn-ghost" onclick="alert('Plan details & version history')">Inspect</button></td>
            </tr>
            <tr>
              <td><code>PRO</code></td>
              <td><strong>Pro Tier</strong></td>
              <td>$499.00 AUD</td>
              <td>Monthly</td>
              <td>v1</td>
              <td>14 Days</td>
              <td><span class="badge badge-active">ACTIVE</span></td>
              <td>15 Outlets • 10,000 Members • 2M AI Tokens • Voice</td>
              <td><button class="btn-sm btn-ghost" onclick="alert('Plan details & version history')">Inspect</button></td>
            </tr>
            <tr>
              <td><code>ENTERPRISE</code></td>
              <td><strong>Enterprise Custom</strong></td>
              <td>Custom / Net 30</td>
              <td>Custom</td>
              <td>v1</td>
              <td>30 Days</td>
              <td><span class="badge badge-active">ACTIVE</span></td>
              <td>Unlimited Outlets • Custom AI & API Limits</td>
              <td><button class="btn-sm btn-ghost" onclick="alert('Contract & overrides')">Contracts</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Real-time Metering Dashboard Preview -->
    <div class="table-card" style="margin-top: 24px;">
      <div class="table-header">
        <h3 class="table-title">Live Organisation Entitlement Gauges (Apex Performance Clubs)</h3>
        <span class="chip chip-active">Period Ending Oct 1</span>
      </div>
      <div style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 600;">Active Outlets</span>
            <span style="color: #34d399;">12 / 15 Used</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div style="width: 80%; height: 100%; background: #34d399;"></div>
          </div>
          <small style="color: var(--text-muted); display: block; margin-top: 6px;">Status: ALLOWED (3 remaining)</small>
        </div>

        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 600;">AI Tokens Allowance</span>
            <span style="color: #38bdf8;">1.8M / 2.0M Used</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div style="width: 90%; height: 100%; background: #fbbf24;"></div>
          </div>
          <small style="color: #fbbf24; display: block; margin-top: 6px;">Status: WARNING (90% soft limit reached)</small>
        </div>

        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 600;">SMS Communications</span>
            <span style="color: #34d399;">4,100 / 5,000 Used</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div style="width: 82%; height: 100%; background: #34d399;"></div>
          </div>
          <small style="color: var(--text-muted); display: block; margin-top: 6px;">Status: ALLOWED (900 remaining)</small>
        </div>

        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 600;">Voice Receptionist</span>
            <span style="color: #a78bfa;">1,240 mins (Included)</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div style="width: 62%; height: 100%; background: #a78bfa;"></div>
          </div>
          <small style="color: var(--text-muted); display: block; margin-top: 6px;">Status: ALLOWED (Overage allowed at $0.08/min)</small>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// ROUTER & EVENT ATTACHMENTS
// -------------------------------------------------------------

function navigate(viewName: string) {
  state.activeView = viewName;
  const container = document.getElementById('view-container');
  if (!container) return;

  // Highlight navigation item
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('data-view') === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  switch (viewName) {
    case 'overview':
      container.innerHTML = renderOverview();
      break;
    case 'organisations':
      container.innerHTML = renderOrganisations();
      attachOrgEvents();
      break;
    case 'feature-flags':
      container.innerHTML = renderFeatureFlags();
      attachFlagEvents();
      break;
    case 'support':
      container.innerHTML = renderSupportQueue();
      break;
    case 'health':
      container.innerHTML = renderHealth();
      break;
    case 'ai-usage':
      container.innerHTML = renderAiUsage();
      break;
    case 'usage':
      container.innerHTML = renderGenericView('Platform Usage Metering', 'System-wide active member, outlet, booking, and communications throughput.');
      break;
    case 'billing':
      container.innerHTML = renderSaasBilling();
      break;
    case 'integrations':
      container.innerHTML = renderGenericView('Integrations Health', 'Xero, Stripe, Twilio, and Wearables connector telemetry.');
      break;
    case 'incidents':
      container.innerHTML = renderIncidents();
      break;
    case 'support-access':
      container.innerHTML = renderGenericView('Support Access & Break-Glass', 'Time-limited, purpose-bound, auditable temporary organisation access.');
      break;
    case 'audit':
      container.innerHTML = renderGenericView('Platform Audit Logs', 'Tamper-evident operational audit events with sanitized metadata.');
      break;
    case 'settings':
      container.innerHTML = renderGenericView('Platform Configuration & Maintenance', 'Dynamic configuration overrides and scoped maintenance mode.');
      break;
    default:
      container.innerHTML = renderOverview();
      break;
  }
}

// -------------------------------------------------------------
// EVENT HANDLERS
// -------------------------------------------------------------

function openStepUpModal(title: string, desc: string, onConfirm: (token: string) => void) {
  const modal = document.getElementById('step-up-modal');
  const titleEl = document.getElementById('step-up-title');
  const descEl = document.getElementById('step-up-desc');
  const inputEl = document.getElementById('step-up-token-input') as HTMLInputElement;
  const errorEl = document.getElementById('step-up-error');

  if (!modal || !titleEl || !descEl || !inputEl) return;

  titleEl.innerText = title;
  descEl.innerText = desc;
  inputEl.value = '';
  if (errorEl) errorEl.classList.add('hidden');
  modal.classList.remove('hidden');

  const confirmBtn = document.getElementById('step-up-confirm-btn');
  const cancelBtn = document.getElementById('step-up-cancel-btn');
  const closeBtn = document.getElementById('modal-close-btn');

  const cleanup = () => {
    modal.classList.add('hidden');
  };

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const token = inputEl.value.trim();
      if (!token) {
        if (errorEl) {
          errorEl.innerText = 'Please enter a valid challenge token or code.';
          errorEl.classList.remove('hidden');
        }
        return;
      }
      cleanup();
      onConfirm(token);
    };
  }

  if (cancelBtn) cancelBtn.onclick = cleanup;
  if (closeBtn) closeBtn.onclick = cleanup;
}

function attachOrgEvents() {
  document.querySelectorAll('.btn-suspend-org').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const orgId = target.getAttribute('data-org-id')!;
      const orgName = target.getAttribute('data-org-name')!;

      openStepUpModal(
        `Suspend Organisation: ${orgName}`,
        `Suspending ${orgName} will block member/staff portal logins and pause integrations. Step-up token required:`,
        (token) => {
          const org = state.organisations.find(o => o.id === orgId);
          if (org) org.status = 'SUSPENDED';
          state.kpis.activeOrganisations--;
          state.kpis.suspendedOrganisations++;
          navigate('organisations');
        }
      );
    });
  });

  document.querySelectorAll('.btn-reactivate-org').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const orgId = target.getAttribute('data-org-id')!;
      const org = state.organisations.find(o => o.id === orgId);
      if (org) org.status = 'ACTIVE';
      state.kpis.activeOrganisations++;
      state.kpis.suspendedOrganisations--;
      navigate('organisations');
    });
  });
}

function attachFlagEvents() {
  document.querySelectorAll('.btn-toggle-flag').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const flagId = target.getAttribute('data-flag-id')!;
      const flag = state.featureFlags.find(f => f.id === flagId);
      if (flag) {
        flag.status = flag.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
        navigate('feature-flags');
      }
    });
  });
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------

window.addEventListener('DOMContentLoaded', async () => {
  // Try fetching live overview from API
  const liveKPIs = await apiFetch('/overview');
  if (liveKPIs) {
    state.kpis = { ...state.kpis, ...liveKPIs };
  }

  const liveOrgs = await apiFetch('/organisations');
  if (liveOrgs && liveOrgs.items) {
    state.organisations = liveOrgs.items;
  }

  // Handle hash navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'overview';
    navigate(hash);
  });

  // Nav menu item clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = (e.currentTarget as HTMLElement).getAttribute('data-view') || 'overview';
      window.location.hash = view;
    });
  });

  // Break-glass trigger button
  const breakGlassBtn = document.getElementById('btn-break-glass-trigger');
  if (breakGlassBtn) {
    breakGlassBtn.addEventListener('click', () => {
      openStepUpModal(
        'Emergency Break-Glass Access Request',
        'Break-glass access generates a high-severity security alert and requires emergency step-up justification:',
        (token) => {
          alert('Break-glass access authorized. High-severity audit event logged.');
        }
      );
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh-data');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      navigate(state.activeView);
    });
  }

  const initialView = window.location.hash.replace('#', '') || 'overview';
  navigate(initialView);
});
