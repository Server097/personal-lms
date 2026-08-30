const STORAGE_KEY = "personalLmsDataV2";

const seed = {
  courses: [
    { id: "college", name: "College Applications" },
    { id: "usaco", name: "USACO" },
    { id: "research", name: "Research Project" }
  ],
  assignments: [
    { id: crypto.randomUUID(), courseId:"college", title:"Choose 3 Common App essay topics", due:"2026-09-01", points:10, score:null, module:"Personal Statement", notes:"Pick three that could reveal something not obvious elsewhere in the application.", done:false },
    { id: crypto.randomUUID(), courseId:"college", title:"Draft activities list v1", due:"2026-09-04", points:20, score:null, module:"Common App", notes:"Complete all 10 slots even if some are rough.", done:false },
    { id: crypto.randomUUID(), courseId:"usaco", title:"Solve 5 Silver graph problems", due:"2026-09-02", points:20, score:null, module:"Graph Traversal", notes:"Record failed approaches before reading editorials.", done:false },
    { id: crypto.randomUUID(), courseId:"usaco", title:"Timed practice contest", due:"2026-09-06", points:40, score:null, module:"Contest Practice", notes:"Use official contest timing. No editorial checks during the session.", done:false },
    { id: crypto.randomUUID(), courseId:"research", title:"Annotate 2 papers + synthesis notes", due:"2026-09-03", points:15, score:null, module:"Literature Review", notes:"For each paper: claim, method, limitation, relevance.", done:false },
    { id: crypto.randomUUID(), courseId:"research", title:"Write research question v2", due:"2026-09-07", points:25, score:null, module:"Problem Definition", notes:"One primary question plus measurable success criterion.", done:false }
  ]
};

let state = {
  courses: structuredClone(seed.courses),
  assignments: []
};
let currentView = "dashboard";
let selectedCourseId = null;

function migrate(old){
  if (!old || !old.assignments) return structuredClone(seed);
  old.assignments = old.assignments.map(a => ({...a, score: a.score ?? (a.done ? a.points : null)}));
  return old;
}

async function loadFromSupabase() {
  const { data, error } = await supabaseClient
    .from("assignments")
    .select("*")
    .order("due");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
async function addAssignmentToSupabase(assignment) {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  const { data, error } = await supabaseClient
    .from("assignments")
    .insert({
      user_id: user.id,
      course_id: assignment.courseId,
      title: assignment.title,
      due: assignment.due,
      points: assignment.points,
      score: assignment.score,
      module: assignment.module || null,
      notes: assignment.notes || null,
      done: assignment.done
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}
async function updateAssignmentInSupabase(assignment) {
  const { error } = await supabaseClient
    .from("assignments")
    .update({
      course_id: assignment.courseId,
      title: assignment.title,
      due: assignment.due,
      points: assignment.points,
      score: assignment.score,
      module: assignment.module || null,
      notes: assignment.notes || null,
      done: assignment.done
    })
    .eq("id", assignment.id);

  if (error) {
    console.error(error);
    throw error;
  }
}

function course(id){ return state.courses.find(c => c.id === id); }
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDate(s){
  if(!s) return "No due date";
  const [y,m,d]=s.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)).toLocaleDateString(undefined,{month:"short",day:"numeric",year:y!==new Date().getFullYear()?"numeric":undefined,timeZone:"UTC"});
}
function statusFor(a){
  if(a.done) return "done";
  if(a.due < todayISO()) return "overdue";
  return "open";
}
function escapeHtml(v=""){
  return String(v).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function gradeFor(courseId){
  const graded = state.assignments.filter(a=>a.courseId===courseId && a.score !== null && a.score !== undefined);
  const earned = graded.reduce((s,a)=>s+Number(a.score||0),0);
  const possible = graded.reduce((s,a)=>s+Number(a.points||0),0);
  const percent = possible ? earned/possible*100 : null;
  return {earned, possible, percent, count: graded.length};
}
function letterGrade(percent){
  if(percent === null) return "—";
  if(percent >= 93) return "A";
  if(percent >= 90) return "A−";
  if(percent >= 87) return "B+";
  if(percent >= 83) return "B";
  if(percent >= 80) return "B−";
  if(percent >= 77) return "C+";
  if(percent >= 73) return "C";
  if(percent >= 70) return "C−";
  if(percent >= 67) return "D+";
  if(percent >= 63) return "D";
  if(percent >= 60) return "D−";
  return "F";
}
function completionFor(courseId){
  const items = state.assignments.filter(a=>a.courseId===courseId);
  const done = items.filter(a=>a.done).length;
  return {done,total:items.length,percent:items.length?Math.round(done/items.length*100):0};
}
function assignmentRow(a){
  const c = course(a.courseId);
  const s = statusFor(a);
  const scoreText = a.score === null || a.score === undefined ? `${a.points} pts` : `${a.score}/${a.points}`;
  return `<div class="assignment ${s==="done"?"completed":""} ${s==="overdue"?"overdue":""}">
    <input type="checkbox" class="toggle-done" data-id="${a.id}" ${a.done?"checked":""} aria-label="Mark ${escapeHtml(a.title)} complete">
    <div>
      <div class="assignment-title">${escapeHtml(a.title)}</div>
      <div class="assignment-meta">${escapeHtml(c?.name||"")} · ${formatDate(a.due)} · ${a.points} pts${a.module ? ` · ${escapeHtml(a.module)}`:""}</div>
    </div>
    <button class="pill ${s}" data-edit="${a.id}">${s==="overdue"?"Overdue":s==="done"?scoreText:`${a.points} pts`}</button>
  </div>`;
}
function dashboard(){
  const cards = state.courses.map(c=>{
    const g=gradeFor(c.id), comp=completionFor(c.id);
    const gradeText = g.percent===null ? "—" : `${g.percent.toFixed(1)}%`;
    return `<button class="card course-open" data-course="${c.id}">
      <div class="course-name">${escapeHtml(c.name)}</div>
      <div class="grade-line"><span class="big-stat">${gradeText}</span><span class="letter">${letterGrade(g.percent)}</span></div>
      <div class="progress"><span style="width:${comp.percent}%"></span></div>
      <div class="small">${comp.done}/${comp.total} assignments complete${g.possible?` · ${g.earned}/${g.possible} graded pts`:""}</div>
    </button>`;
  }).join("");
  const upcoming = [...state.assignments].filter(a=>!a.done).sort((a,b)=>a.due.localeCompare(b.due));
  return `<div class="cards">${cards}</div>
    <section class="panel">
      <div class="panel-head">
        <div><h2>Coming up</h2><div class="small">Future ungraded assignments do not count against your grade.</div></div>
      </div>
      <div class="assignment-list">${upcoming.length?upcoming.map(assignmentRow).join(""):`<div class="empty">Nothing due. Add your next checkpoint.</div>`}</div>
    </section>`;
}
function coursesView(){
  return `<div class="course-grid">${state.courses.map(c=>{
    const as=state.assignments.filter(a=>a.courseId===c.id);
    const g=gradeFor(c.id), comp=completionFor(c.id);
    const gradeText=g.percent===null?"No grade yet":`${g.percent.toFixed(1)}% · ${letterGrade(g.percent)}`;
    return `<button class="panel course-card course-open" data-course="${c.id}">
      <h3>${escapeHtml(c.name)}</h3>
      <div class="course-grade">${gradeText}</div>
      <div class="small">${comp.done}/${comp.total} assignments complete</div>
      <div class="progress"><span style="width:${comp.percent}%"></span></div>
      <div class="small">Open gradebook →</div>
    </button>`;
  }).join("")}</div>`;
}
function courseDetailView(){
  const c=course(selectedCourseId);
  if(!c) return coursesView();
  const as=state.assignments.filter(a=>a.courseId===c.id).sort((a,b)=>a.due.localeCompare(b.due));
  const g=gradeFor(c.id), comp=completionFor(c.id);
  const gradeText=g.percent===null?"—":`${g.percent.toFixed(1)}%`;
  return `<button class="ghost back-courses">← All courses</button>
  <section class="course-hero">
    <div>
      <div class="small">Course grade</div>
      <div class="hero-grade">${gradeText} <span>${letterGrade(g.percent)}</span></div>
      <div class="small">${g.possible?`${g.earned} / ${g.possible} graded points`:"No graded assignments yet"}</div>
    </div>
    <div>
      <div class="small">Completion</div>
      <div class="hero-grade secondary">${comp.percent}%</div>
      <div class="small">${comp.done} / ${comp.total} assignments complete</div>
    </div>
  </section>
  <section class="panel">
    <div class="panel-head">
      <div><h2>${escapeHtml(c.name)} gradebook</h2><div class="small">Only assignments with a score count toward the course grade.</div></div>
    </div>
    <div class="grade-table-wrap">
      <table class="grade-table">
        <thead><tr><th>Assignment</th><th>Due</th><th>Score</th><th>Out of</th><th>Status</th></tr></thead>
        <tbody>${as.map(a=>`<tr>
          <td><button class="link-btn" data-edit="${a.id}">${escapeHtml(a.title)}</button><div class="small">${escapeHtml(a.module||"General")}</div></td>
          <td>${formatDate(a.due)}</td>
          <td>${a.score===null||a.score===undefined?"—":a.score}</td>
          <td>${a.points}</td>
          <td>${a.score===null||a.score===undefined?(a.done?"Completed, ungraded":"Not graded"):"Graded"}</td>
        </tr>`).join("") || `<tr><td colspan="5" class="empty">No assignments yet.</td></tr>`}</tbody>
      </table>
    </div>
  </section>`;
}
function calendarView(){
  const rows=[...state.assignments].sort((a,b)=>a.due.localeCompare(b.due));
  return `<section class="panel">
    <div class="panel-head"><div><h2>Deadline calendar</h2><div class="small">Chronological list of every checkpoint.</div></div></div>
    <div class="calendar-list">${rows.map(a=>`<div class="calendar-row">
      <strong>${formatDate(a.due)}</strong>
      <div><div class="assignment-title">${escapeHtml(a.title)}</div><div class="assignment-meta">${escapeHtml(course(a.courseId)?.name||"")} · ${a.points} pts</div></div>
      <button class="ghost" data-edit="${a.id}">Edit</button>
    </div>`).join("")}</div>
  </section>`;
}
function planningView(){
  const rows=[...state.assignments].sort((a,b)=>a.due.localeCompare(b.due));
  return `<div class="plan-banner"><strong>Planning mode</strong><div class="small">This is the one place where deadlines are editable. Treat normal dashboard deadlines as fixed.</div></div>
  <section class="panel">
    ${rows.map(a=>`<div class="plan-row">
      <div><strong>${escapeHtml(a.title)}</strong><div class="small">${escapeHtml(course(a.courseId)?.name||"")}</div></div>
      <input type="date" data-plan-date="${a.id}" value="${a.due}">
      <input type="number" min="1" max="500" data-plan-points="${a.id}" value="${a.points}">
      <button class="ghost" data-edit="${a.id}">Details</button>
    </div>`).join("")}
  </section>`;
}
function render(){
  const app=document.getElementById("app");
  const title=document.getElementById("viewTitle");
  const subtitle=document.getElementById("viewSubtitle");
  if(currentView==="course"){
    const c=course(selectedCourseId);
    title.textContent=c?.name||"Course";
    subtitle.textContent="Assignments, progress, and gradebook.";
    app.innerHTML=courseDetailView();
  } else {
    const map={
      dashboard:["Dashboard","Your current academic workload, in one place.",dashboard],
      courses:["Courses","Open a course to view its gradebook.",coursesView],
      calendar:["Calendar","All deadlines in chronological order.",calendarView],
      planning:["Planning mode","Adjust deadlines intentionally rather than impulsively.",planningView]
    };
    const [t,s,fn]=map[currentView];
    title.textContent=t; subtitle.textContent=s; app.innerHTML=fn();
  }
  bindDynamic();
}
function bindDynamic(){
  document.querySelectorAll(".toggle-done").forEach(el=>el.addEventListener("change", async ()=>{
    const a=state.assignments.find(x=>x.id===el.dataset.id);
    if(!a) return;
    if(el.checked && (a.score===null || a.score===undefined)) {
      a.done=true;
      a.score=a.points;
    } else if(!el.checked) {
      a.done=false;
      a.score=null;
    } else a.done=el.checked;
    await updateAssignmentInSupabase(a);
render();
  }));
  document.querySelectorAll("[data-edit]").forEach(el=>el.addEventListener("click",()=>openDialog(el.dataset.edit)));
  document.querySelectorAll(".course-open").forEach(el=>el.addEventListener("click",()=>{
    selectedCourseId=el.dataset.course; currentView="course"; render();
  }));
  document.querySelectorAll(".back-courses").forEach(el=>el.addEventListener("click",()=>{
    currentView="courses"; selectedCourseId=null; render();
  }));
  document.querySelectorAll("[data-plan-date]").forEach(el=>el.addEventListener("change", async ()=>{
  const a=state.assignments.find(x=>x.id===el.dataset.planDate);

  if(a){
    a.due=el.value;
    await updateAssignmentInSupabase(a);
    render();
  }
}));
  document.querySelectorAll("[data-plan-points]").forEach(el=>el.addEventListener("change", async ()=>{
  const a=state.assignments.find(x=>x.id===el.dataset.planPoints);

  if(a){
    a.points=Math.max(1,Math.min(500,Number(el.value)||1));

    if(a.score!==null && a.score>a.points){
      a.score=a.points;
    }

    await updateAssignmentInSupabase(a);
    render();
  }
}));
}

function openDialog(id=null){
  const dlg=document.getElementById("assignmentDialog");
  const a=id?state.assignments.find(x=>x.id===id):null;
  document.getElementById("dialogTitle").textContent=a?"Edit assignment":"New assignment";
  document.getElementById("assignmentId").value=a?.id||"";
  document.getElementById("titleInput").value=a?.title||"";
  document.getElementById("courseInput").value=a?.courseId||state.courses[0].id;
  document.getElementById("dueInput").value=a?.due||todayISO();
  document.getElementById("pointsInput").value=a?.points||10;
  document.getElementById("scoreInput").value=(a?.score===null || a?.score===undefined)?"":a.score;
  document.getElementById("moduleInput").value=a?.module||"";
  document.getElementById("notesInput").value=a?.notes||"";
  document.getElementById("deleteAssignmentBtn").classList.toggle("hidden",!a);
  dlg.showModal();
}
function closeDialog(){ document.getElementById("assignmentDialog").close(); }

document.getElementById("courseInput").innerHTML=state.courses.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>{
  currentView=b.dataset.view; selectedCourseId=null;
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x===b));
  render();
}));
document.getElementById("addAssignmentBtn").addEventListener("click",()=>openDialog());
document.getElementById("closeDialog").addEventListener("click",closeDialog);
document.getElementById("cancelDialog").addEventListener("click",closeDialog);

document.getElementById("assignmentForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = document.getElementById("assignmentId").value;

  const points = Math.max(
    1,
    Math.min(
      500,
      Number(document.getElementById("pointsInput").value) || 10
    )
  );

  const scoreRaw = document.getElementById("scoreInput").value.trim();

  const score =
    scoreRaw === ""
      ? null
      : Math.max(0, Math.min(points, Number(scoreRaw)));

  const old = id
    ? state.assignments.find(a => a.id === id)
    : null;

  const payload = {
    id: id || crypto.randomUUID(),
    title: document.getElementById("titleInput").value.trim(),
    courseId: document.getElementById("courseInput").value,
    due: document.getElementById("dueInput").value,
    points,
    score,
    module: document.getElementById("moduleInput").value.trim(),
    notes: document.getElementById("notesInput").value.trim(),
    done: score !== null ? true : (old?.done || false)
  };

  if (!payload.title || !payload.due) return;

  if (!id) {
  const saved = await addAssignmentToSupabase(payload);

  payload.id = saved.id;
  state.assignments.push(payload);
} else {
  await updateAssignmentInSupabase(payload);

  const idx = state.assignments.findIndex(a => a.id === payload.id);

  if (idx >= 0) {
    state.assignments[idx] = payload;
  }
}

  closeDialog();
  render();
});
document.getElementById("deleteAssignmentBtn").addEventListener("click", async () => {
  const id = document.getElementById("assignmentId").value;

  if (!id) return;

  if (confirm("Delete this assignment?")) {
    const { error } = await supabaseClient
      .from("assignments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not delete assignment.");
      return;
    }

    state.assignments = state.assignments.filter(a => a.id !== id);

    closeDialog();
    render();
  }
});
async function initializeApp() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    state.assignments = [];
    render();
    return;
  }

  const assignments = await loadFromSupabase();

  state.assignments = assignments.map(a => ({
    id: a.id,
    courseId: a.course_id,
    title: a.title,
    due: a.due,
    points: a.points,
    score: a.score,
    module: a.module || "",
    notes: a.notes || "",
    done: a.done
  }));

  render();
}

initializeApp();

document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Sign-up successful. Check your email if confirmation is required.");
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Logged in successfully!");
});

async function updateAuthUI() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  const authBox = document.getElementById("authBox");
  const appShell = document.getElementById("appShell");
  const logoutBtn = document.getElementById("logoutBtn");

  if (session) {
  authBox.style.display = "none";
  appShell.style.display = "flex";
  logoutBtn.style.display = "block";
  document.getElementById("storageBadge").textContent = "Supabase";
} else {
  authBox.style.display = "block";
  appShell.style.display = "none";
  logoutBtn.style.display = "none";
}
}

updateAuthUI();

supabaseClient.auth.onAuthStateChange(() => {
  updateAuthUI();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  location.reload();
});