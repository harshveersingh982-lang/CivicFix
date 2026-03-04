// --- CONFIGURATION ---
const SUPABASE_URL = 'https://pfneebyrchjlikgeuxzf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hBRSInDruQ53SvCrwX2L-w_u9UidhU2';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allIssues = [];
let generatedOTP = null;
let otpExpiry = null;


// --- REALTIME LISTENER ---
_supabase
.channel('issues-changes')
.on(
'postgres_changes',
{ event: '*', schema: 'public', table: 'issues' },
() => {
fetchIssues();
}
)
.subscribe();


// --- AUTHENTICATION ---
async function attemptLogin(role){

const userField = role === 'admin' ? 'adminUser' : 'loginUser';
const passField = role === 'admin' ? 'adminPass' : 'loginPass';

const inputUser = document.getElementById(userField).value;
const inputPass = document.getElementById(passField).value;

const { data, error } = await _supabase
.from('profiles')
.select('*')
.eq('username', inputUser)
.eq('password', inputPass)
.eq('role', role)
.single();

if(error || !data){
showToast("Invalid credentials");
return;
}

launch(role,{
name:data.full_name,
id:data.id,
role:data.role,
phone:data.phone,
flat:data.flat,
block:data.block
});
}


// --- LAUNCH DASHBOARD ---
async function launch(role,user){

currentUser = user;

sessionStorage.setItem("civicUser", JSON.stringify(user));
sessionStorage.setItem("civicRole", role);

document.getElementById('loginPage').style.display='none';
document.getElementById('mainApp').style.display='block';

const nameDisplay=document.getElementById('displayUserName');
if(nameDisplay) nameDisplay.innerText=user.name;

const welcome=document.getElementById('welcomeName');
if(welcome) welcome.innerText=user.name;

const flat=document.getElementById("displayFlat");
const block=document.getElementById("displayBlock");

if(flat) flat.innerText=user.flat;
if(block) block.innerText=user.block;

if(role==='admin'){
document.getElementById('adminDashboard').style.display='block';
document.getElementById('userDashboard').style.display='none';
}else{
document.getElementById('userDashboard').style.display='block';
document.getElementById('adminDashboard').style.display='none';
}

fetchIssues();
}


// --- LOGOUT ---
function logout(){
sessionStorage.removeItem("civicUser");
sessionStorage.removeItem("civicRole");
location.reload();
}


// --- OTP SYSTEM ---
function sendOTP(){

const phone=document.getElementById("regPhone").value;

if(!phone){
showToast("Enter phone number");
return;
}

generatedOTP=Math.floor(100000+Math.random()*900000);

otpExpiry=Date.now()+60000;

showToast("OTP generated");

showToast("Verification Code: " + generatedOTP);

document.getElementById("regStep1").style.display="none";
document.getElementById("regStep2").style.display="block";
}


function verifyAndRegister(){

const enteredOTP=document.getElementById("otpInput").value;

if(Date.now()>otpExpiry){
showToast("OTP expired");
return;
}

if(parseInt(enteredOTP)!==generatedOTP){
showToast("Invalid OTP");
return;
}

showToast("Phone verified");

registerUser();
}


// --- REGISTER USER ---
async function registerUser(){

const name = document.getElementById("regName").value;
const phone = document.getElementById("regPhone").value;
const email = document.getElementById("regEmail").value;
const block = document.getElementById("regBlock").value;
const flat = document.getElementById("regFlat").value;
const address = document.getElementById("regAddress").value;

const username = document.getElementById("regUsername").value;
const password = document.getElementById("regPassword").value;


// check if username exists
const { data: existingUser } = await _supabase
.from("profiles")
.select("*")
.eq("username", username);

if(existingUser.length){
showToast("Username already taken. Choose another.");
return;
}


// insert new user
const { error } = await _supabase
.from("profiles")
.insert([{
full_name: name,
phone: phone,
email: email,
block: block,
flat: flat,
address: address,
username: username,
password: password,
role: "user"
}]);


if(error){
console.error(error);
showToast("Registration failed");
return;
}

showToast("Account created successfully!");

toggleReg(false);

}


// --- FETCH ISSUES ---
async function fetchIssues(){

let query=_supabase.from('issues').select('*');

if(currentUser && currentUser.role==='user'){
query=query.eq('reporter',currentUser.name);
}

const { data } = await query.order('id',{ascending:false});

allIssues=data || [];

renderUI();
}


// --- SUBMIT ISSUE ---
document.getElementById('issueForm').onsubmit = async function(e){

    e.preventDefault();

    const submitBtn = this.querySelector("button[type='submit']");
    submitBtn.disabled = true;

    const newIssue = {
        title: document.getElementById('title').value,
        description: document.getElementById('desc').value,
        priority: parseInt(document.getElementById('priority').value),

        reporter: currentUser.name,
        flat: currentUser.flat,
        block: currentUser.block,
        phone: currentUser.phone,

        status: 'pending'
    };

    const { error } = await _supabase.from('issues').insert([newIssue]);

    if(error){
        showToast("Database Error: " + error.message);
        submitBtn.disabled = false;
        return;
    }

    showToast("Report submitted successfully!");

    closeModal();   // closes the popup
    this.reset();   // clears form

    submitBtn.disabled = false;

    fetchIssues();  // refresh dashboard
};


// --- UPDATE ISSUE STATUS ---
async function updateStatus(id,newStatus){

await _supabase
.from('issues')
.update({status:newStatus})
.eq('id',id);

fetchIssues();
}


// --- RENDER UI ---
function renderUI(){

// ADMIN TABLE
const adminBody=document.getElementById('adminBody');

if(adminBody && currentUser.role==='admin'){

adminBody.innerHTML=allIssues.map(issue=>`
<tr onclick="showIssueDetails(${issue.id})" style="cursor:pointer">

<td>${issue.title}</td>
<td>${issue.reporter}</td>

<td>
<span class="priority-badge priority-${issue.priority}">
P${issue.priority}
</span>
</td>

<td>
<span class="badge ${issue.status}">
${issue.status}
</span>
</td>

<td>
${issue.status==='pending'
? `<button class="resolve-btn"
onclick="updateStatus(${issue.id},'resolved');event.stopPropagation();">
Resolve
</button>`
:'✅'}
</td>

</tr>
`).join('');


// ADMIN STATS
const totalAdmin=document.getElementById('a-total');
const pendingAdmin=document.getElementById('a-pending');
const resolvedAdmin=document.getElementById('a-resolved');

if(totalAdmin) totalAdmin.innerText=allIssues.length;

if(pendingAdmin)
pendingAdmin.innerText=
allIssues.filter(i=>i.status==='pending').length;

if(resolvedAdmin)
resolvedAdmin.innerText=
allIssues.filter(i=>i.status==='resolved').length;
}


// USER DASHBOARD
if(currentUser.role==='user'){

const container=document.getElementById('userReports');

const total=document.getElementById('u-total');
const resolved=document.getElementById('u-resolved');

if(total) total.innerText=allIssues.length;

if(resolved)
resolved.innerText=
allIssues.filter(i=>i.status==='resolved').length;

if(container){

container.innerHTML=allIssues.map(issue=>`

<div class="user-report-card">

<h4>${issue.title}</h4>

<p>${issue.description}</p>

<span class="priority-badge priority-${issue.priority}">
Priority ${issue.priority}
</span>

<br>

<small>Status:
<strong class="${issue.status}">
${issue.status.toUpperCase()}
</strong>
</small>

</div>

`).join('');

}

}
}


// --- ISSUE DETAILS MODAL ---
function showIssueDetails(id){

const issue=allIssues.find(i=>i.id===id);

const content=document.getElementById("detailContent");
const resolveArea=document.getElementById("resolveBtnArea");

content.innerHTML=`

<p><strong>Title:</strong> ${issue.title}</p>
<p><strong>Description:</strong> ${issue.description}</p>

<hr>

<p><strong>Reporter:</strong> ${issue.reporter}</p>
<p><strong>Flat:</strong> ${issue.flat}</p>
<p><strong>Block:</strong> ${issue.block}</p>
<p><strong>Contact:</strong> ${issue.phone}</p>

<hr>

<p><strong>Priority:</strong> ${issue.priority}</p>
<p><strong>Status:</strong> ${issue.status}</p>
`;

if(issue.status==="pending"){

resolveArea.innerHTML=`
<button class="resolve-btn"
onclick="updateStatus(${issue.id},'resolved')">
Resolve Issue
</button>
`;

}else{
resolveArea.innerHTML="";
}

document.getElementById("detailModal").style.display="flex";
}


// --- UI HELPERS ---
function closeDetailModal(){
document.getElementById("detailModal").style.display="none";
}

function openModal(){
document.getElementById('reportModal').style.display='flex';
}

function showToast(message){

const toast=document.getElementById("toast");

toast.innerText=message;
toast.classList.add("show");

setTimeout(()=>{
toast.classList.remove("show");
},3000);

}

function switchAuth(type){

document.getElementById('userAuthForm').style.display=
type==='user'?'block':'none';

document.getElementById('adminAuthForm').style.display=
type==='admin'?'block':'none';

document.getElementById('tabUser').classList.toggle('active',type==='user');
document.getElementById('tabAdmin').classList.toggle('active',type==='admin');

}


// --- AUTO REFRESH ---
setInterval(()=>{
if(currentUser){
fetchIssues();
}
},2000);

function closeModal(){
    document.getElementById("reportModal").style.display = "none";
}

// --- AUTO LOGIN ---
window.addEventListener("load",()=>{

const savedUser = sessionStorage.getItem("civicUser");
const savedRole = sessionStorage.getItem("civicRole");

if(savedUser && savedRole){
launch(savedRole,JSON.parse(savedUser));
}

});

function toggleReg(showRegister){

    const loginFields = document.getElementById("loginFields");
    const registerFields = document.getElementById("registerFields");

    if(showRegister){
        loginFields.style.display = "none";
        registerFields.style.display = "block";
    }else{
        loginFields.style.display = "block";
        registerFields.style.display = "none";
    }

}

function resetReg(){

    document.getElementById("regStep1").style.display = "block";
    document.getElementById("regStep2").style.display = "none";

}