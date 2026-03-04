let users = JSON.parse(localStorage.getItem('civicUsers')) || [];
let issues = JSON.parse(localStorage.getItem('civicIssues')) || [];
let currentUser = null;
let generatedOTP = null;
let tempUserData = null;

// --- AUTH UI ---
function switchAuth(type) {
    document.getElementById('userAuthForm').style.display = type === 'user' ? 'block' : 'none';
    document.getElementById('adminAuthForm').style.display = type === 'admin' ? 'block' : 'none';
    document.getElementById('tabUser').classList.toggle('active', type === 'user');
    document.getElementById('tabAdmin').classList.toggle('active', type === 'admin');
}

function toggleReg(show) {
    document.getElementById('loginFields').style.display = show ? 'none' : 'block';
    document.getElementById('registerFields').style.display = show ? 'block' : 'none';
}

// --- OTP LOGIC ---
function sendOTP() {
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    if(!name || phone.length < 10) return alert("Valid Name and Phone required.");

    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    alert(`[SIMULATED SMS]\nVerification Code: ${generatedOTP}`);

    tempUserData = {
        uid: "CID" + Math.floor(1000 + Math.random() * 9000),
        name: name,
        phone: phone,
        email: document.getElementById('regEmail').value,
        block: document.getElementById('regBlock').value,
        flat: document.getElementById('regFlat').value,
        address: document.getElementById('regAddress').value,
        pass: "123"
    };

    document.getElementById('regStep1').style.display = 'none';
    document.getElementById('regStep2').style.display = 'block';
}

function verifyAndRegister() {
    if(document.getElementById('otpInput').value === generatedOTP) {
        users.push(tempUserData);
        localStorage.setItem('civicUsers', JSON.stringify(users));
        alert("Account Created! Use CID: " + tempUserData.uid);
        location.reload();
    } else alert("Wrong OTP.");
}

function resetReg() {
    document.getElementById('regStep1').style.display = 'block';
    document.getElementById('regStep2').style.display = 'none';
}

// --- APP FLOW ---
function attemptLogin(role) {
    if(role === 'admin') {
        const u = document.getElementById('adminUser').value;
        const p = document.getElementById('adminPass').value;
        if(u === 'admin01' && p === 'city123') launch('admin', {name: "Admin"});
        else alert("Incorrect Admin Access.");
    } else {
        const id = document.getElementById('loginUser').value;
        const pass = document.getElementById('loginPass').value;
        const found = users.find(u => (u.uid === id || u.email === id) && u.pass === pass);
        if(found) launch('user', found);
        else alert("Invalid Resident ID/Pass.");
    }
}

function launch(role, user) {
    currentUser = user;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('displayUserName').innerText = user.name;

    if(role === 'admin') {
        document.getElementById('adminDashboard').style.display = 'block';
        renderAdminTable();
    } else {
        document.getElementById('userDashboard').style.display = 'block';
        document.getElementById('welcomeName').innerText = user.name;
        document.getElementById('displayFlat').innerText = user.flat;
        document.getElementById('displayBlock').innerText = user.block;
        updateUserStats();
    }
}

// --- MODALS ---
function openModal() { document.getElementById('reportModal').style.display = "block"; }
function closeModal() { document.getElementById('reportModal').style.display = "none"; }

document.getElementById('issueForm').onsubmit = function(e) {
    e.preventDefault();
    issues.push({
        id: Date.now(),
        reporter: currentUser.name,
        title: document.getElementById('title').value,
        desc: document.getElementById('desc').value,
        status: 'pending',
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem('civicIssues', JSON.stringify(issues));
    closeModal(); updateUserStats(); this.reset();
};

function updateUserStats() {
    const my = issues.filter(i => i.reporter === currentUser.name);
    document.getElementById('u-total').innerText = my.length;
    document.getElementById('u-resolved').innerText = my.filter(i => i.status === 'resolved').length;
}

function renderAdminTable() {
    const tbody = document.getElementById('adminBody');
    tbody.innerHTML = issues.map(i => `
        <tr class="clickable-row" onclick="viewDetail(${i.id})">
            <td><strong>${i.title}</strong><br><small>${i.date}</small></td>
            <td>${i.reporter}</td>
            <td>${i.status === 'pending' ? '🟡 Pending' : '🟢 Resolved'}</td>
            <td><button class="btn-cancel" style="padding:5px 10px;">View</button></td>
        </tr>
    `).join('');
}

function viewDetail(id) {
    const issue = issues.find(x => x.id === id);
    const reporter = users.find(u => u.name === issue.reporter) || {};
    document.getElementById('detailContent').innerHTML = `
        <div class="input-group"><label>Subject</label><p>${issue.title}</p></div>
        <div class="input-group"><label>Desc</label><p>${issue.desc}</p></div>
        <div class="input-group"><label>Reporter</label><p>${issue.reporter} (F: ${reporter.flat}, B: ${reporter.block})</p></div>
    `;
    const btnArea = document.getElementById('resolveBtnArea');
    btnArea.innerHTML = issue.status === 'pending' 
        ? `<button class="btn-primary-glow" onclick="resolveIssue(${issue.id})">Mark Resolved</button>`
        : `<p style="color:var(--secondary); font-weight:800;">Resolved ✅</p>`;
    document.getElementById('detailModal').style.display = "block";
}

function closeDetailModal() { document.getElementById('detailModal').style.display = "none"; }
function resolveIssue(id) {
    const idx = issues.findIndex(x => x.id === id);
    issues[idx].status = 'resolved';
    localStorage.setItem('civicIssues', JSON.stringify(issues));
    renderAdminTable(); closeDetailModal();
}