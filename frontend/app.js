// ═══ ProjectFlow SPA ═══
const API = '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let currentProject = null;

// ── API Helper ──
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Toast ──
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Modal ──
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// ── Auth ──
function initAuth() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('form-login').classList.toggle('hidden', tab.dataset.tab !== 'login');
      document.getElementById('form-signup').classList.toggle('hidden', tab.dataset.tab !== 'signup');
    });
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/login', { method: 'POST', body: {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      }});
      token = data.token; localStorage.setItem('token', token);
      currentUser = data.user;
      toast('Welcome back!', 'success');
      showApp();
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('form-signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/signup', { method: 'POST', body: {
        name: document.getElementById('signup-name').value,
        email: document.getElementById('signup-email').value,
        password: document.getElementById('signup-password').value
      }});
      token = data.token; localStorage.setItem('token', token);
      currentUser = data.user;
      toast('Account created!', 'success');
      showApp();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function getInitials(name) { return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }

function showAuth() {
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('app-shell').classList.add('hidden');
}

async function showApp() {
  if (!currentUser) {
    try { const d = await api('/auth/me'); currentUser = d.user; }
    catch { token = null; localStorage.removeItem('token'); showAuth(); return; }
  }
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = getInitials(currentUser.name);
  navigateTo('dashboard');
}

// ── Navigation ──
function navigateTo(page, data) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (page === 'dashboard') {
    document.getElementById('page-dashboard').classList.add('active');
    document.getElementById('nav-dashboard').classList.add('active');
    document.getElementById('page-title').textContent = 'Dashboard';
    document.getElementById('topbar-actions').innerHTML = '';
    loadDashboard();
  } else if (page === 'projects') {
    document.getElementById('page-projects').classList.add('active');
    document.getElementById('nav-projects').classList.add('active');
    document.getElementById('page-title').textContent = 'Projects';
    document.getElementById('topbar-actions').innerHTML = '<button class="btn btn-primary btn-sm" onclick="openCreateProject()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Project</button>';
    loadProjects();
  } else if (page === 'project-detail') {
    document.getElementById('page-project-detail').classList.add('active');
    document.getElementById('nav-projects').classList.add('active');
    document.getElementById('page-title').textContent = 'Project';
    currentProject = data;
    loadProjectDetail(data);
  }
}

// ── Dashboard ──
async function loadDashboard() {
  try {
    const d = await api('/dashboard');
    const el = document.getElementById('dashboard-content');
    el.innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div><div class="stat-value">${d.totalProjects}</div><div class="stat-label">Projects</div></div>
        <div class="stat-card"><div class="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg></div><div class="stat-value">${d.totalTasks}</div><div class="stat-label">Total Tasks</div></div>
        <div class="stat-card"><div class="stat-icon amber"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-value">${d.statusCounts['in-progress']}</div><div class="stat-label">In Progress</div></div>
        <div class="stat-card"><div class="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="stat-value">${d.statusCounts.done}</div><div class="stat-label">Completed</div></div>
        <div class="stat-card"><div class="stat-icon red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div class="stat-value">${d.overdueTasks}</div><div class="stat-label">Overdue</div></div>
      </div>
      <div class="progress-section">
        <div class="section-card">
          <div class="section-title">📊 Task Status Breakdown</div>
          ${makeProgressBar('To Do', d.statusCounts.todo, d.totalTasks, '')}
          ${makeProgressBar('In Progress', d.statusCounts['in-progress'], d.totalTasks, 'amber')}
          ${makeProgressBar('Done', d.statusCounts.done, d.totalTasks, 'green')}
        </div>
        <div class="section-card">
          <div class="section-title">🔥 My Tasks</div>
          ${d.myTasksList.length ? d.myTasksList.map(t => `
            <div class="task-item-compact" onclick="navigateTo('project-detail','${t.project._id || t.project}')">
              <span class="badge badge-${t.status}">${t.status}</span>
              <span class="task-title-compact">${esc(t.title)}</span>
              <span class="task-project-name">${t.project.name || ''}</span>
            </div>`).join('') : '<p style="color:var(--text-muted);font-size:0.85rem;">No tasks assigned to you</p>'}
        </div>
      </div>
      <div class="section-card">
        <div class="section-title">🕐 Recent Tasks</div>
        <div class="task-list-compact">
          ${d.recentTasks.length ? d.recentTasks.map(t => `
            <div class="task-item-compact" onclick="navigateTo('project-detail','${t.project._id || t.project}')">
              <span class="badge badge-${t.priority}">${t.priority}</span>
              <span class="badge badge-${t.status}">${t.status}</span>
              <span class="task-title-compact">${esc(t.title)}</span>
              ${t.dueDate ? `<span class="task-card-due ${new Date(t.dueDate)<new Date()&&t.status!=='done'?'overdue':''}">${formatDate(t.dueDate)}</span>` : ''}
            </div>`).join('') : '<p style="color:var(--text-muted);font-size:0.85rem;">No tasks yet</p>'}
        </div>
      </div>`;
  } catch (err) { toast(err.message, 'error'); }
}

function makeProgressBar(label, value, total, color) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return `<div class="progress-bar-wrapper"><div class="progress-label"><span>${label}</span><span>${value} (${pct}%)</span></div><div class="progress-track"><div class="progress-fill ${color}" style="width:${pct}%"></div></div></div>`;
}

// ── Projects ──
async function loadProjects() {
  try {
    const projects = await api('/projects');
    const el = document.getElementById('projects-content');
    if (!projects.length) {
      el.innerHTML = '<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><h3>No projects yet</h3><p>Create your first project to get started</p><button class="btn btn-primary" onclick="openCreateProject()">Create Project</button></div>';
      return;
    }
    el.innerHTML = projects.map(p => {
      const pct = p.taskCount ? Math.round((p.doneCount / p.taskCount) * 100) : 0;
      return `<div class="project-card" onclick="navigateTo('project-detail','${p._id}')">
        <div class="project-card-title">${esc(p.name)}</div>
        <div class="project-card-desc">${esc(p.description || 'No description')}</div>
        <div class="project-card-meta"><span>👥 ${p.members.length}</span><span>📋 ${p.taskCount} tasks</span><span>✅ ${pct}%</span></div>
        <div class="project-card-progress"><div class="progress-track"><div class="progress-fill green" style="width:${pct}%"></div></div></div>
      </div>`;
    }).join('');
  } catch (err) { toast(err.message, 'error'); }
}

function openCreateProject() {
  openModal('New Project', `<form id="form-create-project">
    <div class="form-group"><label for="cp-name">Project Name</label><input type="text" id="cp-name" required placeholder="My Awesome Project"></div>
    <div class="form-group"><label for="cp-desc">Description</label><textarea id="cp-desc" placeholder="What's this project about?"></textarea></div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create</button></div>
  </form>`);
  document.getElementById('form-create-project').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/projects', { method: 'POST', body: { name: document.getElementById('cp-name').value, description: document.getElementById('cp-desc').value } });
      closeModal(); toast('Project created!', 'success'); loadProjects();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ── Project Detail ──
async function loadProjectDetail(projectId) {
  try {
    const project = await api(`/projects/${projectId}`);
    const tasks = await api(`/projects/${projectId}/tasks`);
    const role = project.members.find(m => (m.user._id || m.user) === currentUser._id)?.role || 'Member';
    const isAdmin = role === 'Admin';

    document.getElementById('page-title').textContent = project.name;
    const topActions = document.getElementById('topbar-actions');
    topActions.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="navigateTo('projects')">← Back</button>
      <button class="btn btn-primary btn-sm" onclick="openCreateTask('${projectId}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Task</button>
      ${isAdmin ? `<button class="btn btn-secondary btn-sm" onclick="openAddMember('${projectId}')">👥 Add Member</button>` : ''}`;

    const el = document.getElementById('project-detail-content');
    el.innerHTML = `
      <div class="project-header">
        <div class="project-header-info"><h2>${esc(project.name)}</h2><p>${esc(project.description || 'No description')}</p></div>
        <div><span class="badge badge-${role.toLowerCase()}">${role}</span></div>
      </div>
      <div class="project-tabs">
        <button class="project-tab active" onclick="showProjectTab(this,'tasks')">Tasks (${tasks.length})</button>
        <button class="project-tab" onclick="showProjectTab(this,'members')">Members (${project.members.length})</button>
      </div>
      <div id="tab-tasks">
        <div class="tasks-filters">
          <select class="filter-select" id="filter-status" onchange="filterTasks('${projectId}')"><option value="">All Status</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option></select>
          <select class="filter-select" id="filter-priority" onchange="filterTasks('${projectId}')"><option value="">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        </div>
        <div class="tasks-list" id="tasks-list">${renderTasks(tasks, isAdmin, projectId)}</div>
      </div>
      <div id="tab-members" style="display:none">
        <div class="members-list">${project.members.map(m => `
          <div class="member-item">
            <div class="user-avatar">${getInitials(m.user.name)}</div>
            <div class="member-info"><div class="member-name">${esc(m.user.name)}</div><div class="member-email">${esc(m.user.email)}</div></div>
            <span class="badge badge-${m.role.toLowerCase()}">${m.role}</span>
            ${isAdmin && m.user._id !== project.owner._id ? `<button class="btn-icon" onclick="removeMember('${projectId}','${m.user._id}')" title="Remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
          </div>`).join('')}</div>
      </div>`;
  } catch (err) { toast(err.message, 'error'); }
}

function renderTasks(tasks, isAdmin, projectId) {
  if (!tasks.length) return '<div class="empty-state"><h3>No tasks yet</h3><p>Create a task to get started</p></div>';
  return tasks.map(t => {
    const due = t.dueDate ? formatDate(t.dueDate) : '';
    const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done';
    return `<div class="task-card" onclick="openEditTask('${t._id}','${projectId}')">
      <div class="task-card-content">
        <div class="task-card-title">${esc(t.title)}</div>
        <div class="task-card-meta">
          <span class="badge badge-${t.status}">${t.status}</span>
          <span class="badge badge-${t.priority}">${t.priority}</span>
          ${overdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}
          ${due ? `<span class="task-card-due ${overdue?'overdue':''}">${due}</span>` : ''}
        </div>
      </div>
      ${t.assignee ? `<div class="task-card-assignee" title="${esc(t.assignee.name)}">${getInitials(t.assignee.name)}</div>` : ''}
      ${isAdmin ? `<div class="task-card-actions"><button class="btn-icon" onclick="event.stopPropagation();deleteTask('${t._id}','${projectId}')" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div>` : ''}
    </div>`;
  }).join('');
}

function showProjectTab(btn, tab) {
  btn.parentElement.querySelectorAll('.project-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-tasks').style.display = tab === 'tasks' ? '' : 'none';
  document.getElementById('tab-members').style.display = tab === 'members' ? '' : 'none';
}

async function filterTasks(projectId) {
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  let q = `/projects/${projectId}/tasks?`;
  if (status) q += `status=${status}&`;
  if (priority) q += `priority=${priority}&`;
  try {
    const tasks = await api(q);
    const project = await api(`/projects/${projectId}`);
    const role = project.members.find(m => (m.user._id || m.user) === currentUser._id)?.role;
    document.getElementById('tasks-list').innerHTML = renderTasks(tasks, role === 'Admin', projectId);
  } catch (err) { toast(err.message, 'error'); }
}

// ── Task CRUD ──
async function openCreateTask(projectId) {
  const project = await api(`/projects/${projectId}`);
  const membersOpts = project.members.map(m => `<option value="${m.user._id}">${esc(m.user.name)}</option>`).join('');
  openModal('New Task', `<form id="form-task">
    <div class="form-group"><label>Title</label><input type="text" id="t-title" required></div>
    <div class="form-group"><label>Description</label><textarea id="t-desc"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Status</label><select id="t-status"><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div>
      <div class="form-group"><label>Priority</label><select id="t-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Assignee</label><select id="t-assignee"><option value="">Unassigned</option>${membersOpts}</select></div>
      <div class="form-group"><label>Due Date</label><input type="date" id="t-due"></div>
    </div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Task</button></div>
  </form>`);
  document.getElementById('form-task').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/projects/${projectId}/tasks`, { method: 'POST', body: {
        title: document.getElementById('t-title').value,
        description: document.getElementById('t-desc').value,
        status: document.getElementById('t-status').value,
        priority: document.getElementById('t-priority').value,
        assignee: document.getElementById('t-assignee').value || null,
        dueDate: document.getElementById('t-due').value || null
      }});
      closeModal(); toast('Task created!', 'success'); loadProjectDetail(projectId);
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function openEditTask(taskId, projectId) {
  try {
    const project = await api(`/projects/${projectId}`);
    const tasks = await api(`/projects/${projectId}/tasks`);
    const t = tasks.find(x => x._id === taskId);
    if (!t) return;
    const membersOpts = project.members.map(m => `<option value="${m.user._id}" ${t.assignee && t.assignee._id === m.user._id ? 'selected' : ''}>${esc(m.user.name)}</option>`).join('');
    openModal('Edit Task', `<form id="form-edit-task">
      <div class="form-group"><label>Title</label><input type="text" id="et-title" value="${esc(t.title)}" required></div>
      <div class="form-group"><label>Description</label><textarea id="et-desc">${esc(t.description)}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Status</label><select id="et-status"><option value="todo" ${t.status==='todo'?'selected':''}>To Do</option><option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option><option value="done" ${t.status==='done'?'selected':''}>Done</option></select></div>
        <div class="form-group"><label>Priority</label><select id="et-priority"><option value="low" ${t.priority==='low'?'selected':''}>Low</option><option value="medium" ${t.priority==='medium'?'selected':''}>Medium</option><option value="high" ${t.priority==='high'?'selected':''}>High</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Assignee</label><select id="et-assignee"><option value="">Unassigned</option>${membersOpts}</select></div>
        <div class="form-group"><label>Due Date</label><input type="date" id="et-due" value="${t.dueDate ? t.dueDate.slice(0,10) : ''}"></div>
      </div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div>
    </form>`);
    document.getElementById('form-edit-task').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api(`/tasks/${taskId}`, { method: 'PUT', body: {
          title: document.getElementById('et-title').value,
          description: document.getElementById('et-desc').value,
          status: document.getElementById('et-status').value,
          priority: document.getElementById('et-priority').value,
          assignee: document.getElementById('et-assignee').value || null,
          dueDate: document.getElementById('et-due').value || null
        }});
        closeModal(); toast('Task updated!', 'success'); loadProjectDetail(projectId);
      } catch (err) { toast(err.message, 'error'); }
    });
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteTask(taskId, projectId) {
  if (!confirm('Delete this task?')) return;
  try { await api(`/tasks/${taskId}`, { method: 'DELETE' }); toast('Task deleted', 'success'); loadProjectDetail(projectId); }
  catch (err) { toast(err.message, 'error'); }
}

// ── Members ──
function openAddMember(projectId) {
  openModal('Add Member', `<form id="form-add-member">
    <div class="form-group"><label>Email</label><input type="email" id="am-email" required placeholder="member@example.com"></div>
    <div class="form-group"><label>Role</label><select id="am-role"><option value="Member">Member</option><option value="Admin">Admin</option></select></div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add Member</button></div>
  </form>`);
  document.getElementById('form-add-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/projects/${projectId}/members`, { method: 'POST', body: { email: document.getElementById('am-email').value, role: document.getElementById('am-role').value }});
      closeModal(); toast('Member added!', 'success'); loadProjectDetail(projectId);
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function removeMember(projectId, userId) {
  if (!confirm('Remove this member?')) return;
  try { await api(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }); toast('Member removed', 'success'); loadProjectDetail(projectId); }
  catch (err) { toast(err.message, 'error'); }
}

// ── Utils ──
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById('btn-logout').addEventListener('click', () => { token = null; currentUser = null; localStorage.removeItem('token'); showAuth(); toast('Logged out', 'info'); });
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => navigateTo(n.dataset.page)));
  document.getElementById('sidebar-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

  document.getElementById('btn-seed').addEventListener('click', async () => {
    if (!confirm('Seed demo data?')) return;
    try { await api('/dashboard/seed', { method: 'POST' }); toast('Demo data seeded!', 'success'); loadDashboard(); }
    catch (err) { toast(err.message, 'error'); }
  });

  if (token) showApp(); else showAuth();
});
