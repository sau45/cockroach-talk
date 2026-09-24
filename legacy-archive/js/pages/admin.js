let adminPassword = '';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  const pwdInput = document.getElementById('admin-password');
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const btnRefresh = document.getElementById('btn-refresh');

  // Try to load from session storage
  if (sessionStorage.getItem('adminPassword')) {
    adminPassword = sessionStorage.getItem('adminPassword');
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    loadReports();
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    adminPassword = pwdInput.value;
    
    // Quick validation check
    fetch('/api/admin/reports', {
      headers: { 'x-admin-password': adminPassword }
    })
    .then(res => {
      if (!res.ok) throw new Error('Invalid password');
      return res.json();
    })
    .then(data => {
      sessionStorage.setItem('adminPassword', adminPassword);
      loginContainer.style.display = 'none';
      dashboardContainer.style.display = 'block';
      renderReports(data.reports || []);
    })
    .catch(err => {
      alert('Invalid admin password.');
      pwdInput.value = '';
    });
  });

  btnRefresh.addEventListener('click', loadReports);
});

async function loadReports() {
  try {
    const res = await fetch('/api/admin/reports', {
      headers: { 'x-admin-password': adminPassword }
    });
    
    if (res.status === 401) {
      sessionStorage.removeItem('adminPassword');
      location.reload();
      return;
    }
    
    const data = await res.json();
    renderReports(data.reports || []);

    // Also load banned users
    const bannedRes = await fetch('/api/admin/banned', {
      headers: { 'x-admin-password': adminPassword }
    });
    if (bannedRes.ok) {
      const bannedData = await bannedRes.json();
      renderBanned(bannedData.bannedUsers || []);
    }
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

function renderBanned(bannedUsers) {
  const tbody = document.getElementById('banned-tbody');
  const noBannedMsg = document.getElementById('no-banned-msg');
  
  tbody.innerHTML = '';
  
  if (bannedUsers.length === 0) {
    noBannedMsg.style.display = 'block';
    return;
  }
  
  noBannedMsg.style.display = 'none';
  
  bannedUsers.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge" style="background:rgba(239,68,68,0.2); color:var(--accent-danger);">${escapeHTML(u.tag)}</span></td>
      <td>${escapeHTML(u.name || 'Unknown')}</td>
      <td>
        <button class="btn btn-sm btn-unban" data-tag="${escapeHTML(u.tag)}" style="background: var(--accent-success, #10b981); color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Unban</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.querySelectorAll('.btn-unban').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tag = e.target.getAttribute('data-tag');
      if (confirm(`Are you sure you want to UNBAN user ${tag}?`)) {
        await unbanUser(tag);
      }
    });
  });
}

async function unbanUser(tag) {
  try {
    const res = await fetch('/api/admin/unban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ targetTag: tag })
    });
    
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadReports(); // Refreshes both tables
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to unban user.');
  }
}

function renderReports(reports) {
  const tbody = document.getElementById('reports-tbody');
  const noReportsMsg = document.getElementById('no-reports-msg');
  
  tbody.innerHTML = '';
  
  if (reports.length === 0) {
    noReportsMsg.style.display = 'block';
    return;
  }
  
  noReportsMsg.style.display = 'none';
  
  reports.forEach(r => {
    const tr = document.createElement('tr');
    
    const date = new Date(r.timestamp).toLocaleString();
    
    tr.innerHTML = `
      <td>${date}</td>
      <td><span class="badge" style="background:var(--bg-glass);">${escapeHTML(r.reporterTag)}</span></td>
      <td><span class="badge" style="background:rgba(239,68,68,0.2); color:var(--accent-danger);">${escapeHTML(r.reportedTag)}</span></td>
      <td>${escapeHTML(r.reason)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-ban" data-id="${r._id}" data-tag="${escapeHTML(r.reportedTag)}" style="background: var(--accent-danger); color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Ban User</button>
          <button class="btn btn-sm btn-dismiss" data-id="${r._id}" style="background: var(--text-muted); color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Dismiss</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Attach events
  document.querySelectorAll('.btn-ban').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tag = e.target.getAttribute('data-tag');
      if (confirm(`Are you sure you want to BAN user ${tag}?\nThis will kick them immediately and prevent them from joining any rooms.`)) {
        await banUser(tag);
      }
    });
  });
  
  document.querySelectorAll('.btn-dismiss').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Dismiss this report?')) {
        await dismissReport(id);
      }
    });
  });
}

async function banUser(tag) {
  try {
    const res = await fetch('/api/admin/ban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ targetTag: tag })
    });
    
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadReports();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to ban user.');
  }
}

async function dismissReport(id) {
  try {
    const res = await fetch('/api/admin/dismiss', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({ reportId: id })
    });
    
    const data = await res.json();
    if (data.success) {
      loadReports();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to dismiss report.');
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
