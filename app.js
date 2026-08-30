const STORAGE_KEY = "personalLmsDataV1";

const seed = {
  courses: [
    { id: "college", name: "College Applications", target: 250 },
    { id: "usaco", name: "USACO", target: 250 },
    { id: "research", name: "Research Project", target: 250 }
  ],
  assignments: [
    { id: crypto.randomUUID(), courseId:"college", title:"Choose 3 Common App essay topics", due:"2026-09-01", points:10, module:"Personal Statement", notes:"Pick three that could reveal something not obvious elsewhere in the application.", done:false },
    { id: crypto.randomUUID(), courseId:"college", title:"Draft activities list v1", due:"2026-09-04", points:20, module:"Common App", notes:"Complete all 10 slots even if some are rough.", done:false },
    { id: crypto.randomUUID(), courseId:"usaco", title:"Solve 5 Silver graph problems", due:"2026-09-02", points:20, module:"Graph Traversal", notes:"Record failed approaches before reading editorials.", done:false },
    { id: crypto.randomUUID(), courseId:"usaco", title:"Timed practice contest", due:"2026-09-06", points:40, module:"Contest Practice", notes:"Use official contest timing. No editorial checks during the session.", done:false },
    { id: crypto.randomUUID(), courseId:"research", title:"Annotate 2 papers + synthesis notes", due:"2026-09-03", points:15, module:"Literature Review", notes:"For each paper: claim, method, limitation, relevance.", done:false },
    { id: crypto.randomUUID(), courseId:"research", title:"Write research question v2", due:"2026-09-07", points:25, module:"Problem Definition", notes:"One primary question plus measurable success criterion.", done:false }
  ]
};

let state = load();
let currentView = "dashboard";

function load(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  try { return JSON.parse(saved); }
  catch { return structuredClone(seed); }
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function course(id){ return state.courses.find(c => c.id === id); }
function todayISO(){
  const d = new Date();
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
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
function pct(courseId){
  const c = course(courseId);
  const earned = state.assignments.filter(a=>a.courseId===courseId && a.done).reduce((s,a)=>s+a.points,0);
  const assigned = state.assignments.filter(a=>a.courseId===courseId).reduce((s,a)=>s+a.points,0);
  const denominator = Math.max(c.target || 1, assigned || 1);
  return { earned, assigned, percent: Math.min(100, Math.round(earned/denominator*100)) };
}
function escapeHtml(v=""){
  return String(v).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}
function assignmentRow(a){
  const c = course(a.courseId);
  const s = statusFor(a);
  const statusLabel = s==="done" ? "Done" : s==="overdue" ? "Overdue" : `${a.points} pts`;
  return `<div class="assignment ${s==="done"?"completed":""} ${s==="overdue"?"overdue":""}">
    <input type="checkbox" class="toggle-done" data-id="${a.id}" ${a.done?"checked":""} aria-label="Mark ${escapeHtml(a.title)} complete">
    <div>
      <div class="assignment-title">${escapeHtml(a.title)}</div>
      <div class="assignment-meta">${escapeHtml(c?.name||"")} · ${formatDate(a.due)} · ${a.points} pts${a.module ? ` · ${escapeHtml(a.module)}`:""}</div>
    </div>
    <button class="pill ${s}" data-edit="${a.id}">${statusLabel}</button>
  </div>`;
}
function dashboard(){
  const cards = state.courses.map(c=>{
    const p=pct(c.id);
    return `<article class="card">
      <div class="course-name">${escapeHtml(c.name)}</div>
      <div class="big-stat">${p.percent}%</div>
      <div class="progress"><span style="width:${p.percent}%"></span></div>
      <div class="small">${p.earned} pts earned · ${p.assigned} pts assigned</div>
    </article>`;
  }).join("");

  const upcoming = [...state.assignments].filter(a=>!a.done).sort((a,b)=>a.due.localeCompare(b.due));
  const completedPts = state.assignments.filter(a=>a.done).reduce((s,a)=>s+a.points,0);
  return `<div class="cards">${cards}</div>
    <section class="panel">
      <div class="panel-head">
        <div><h2>Coming up</h2><div class="small">${completedPts} total points completed</div></div>
      </div>
      <div class="assignment-list">${upcoming.length?upcoming.map(assignmentRow).join(""):`<div class="empty">Nothing due. Add your next checkpoint.</div>`}</div>
    </section>`;
}
function coursesView(){
  return `<div class="course-grid">${state.courses.map(c=>{
    const as=state.assignments.filter(a=>a.courseId===c.id);
    const modules=[...new Set(as.map(a=>a.module||"General"))];
    const p=pct(c.id);
    return `<section class="panel course-card">
      <h3>${escapeHtml(c.name)}</h3>
      <div class="small">${p.percent}% progress · ${as.filter(a=>a.done).length}/${as.length} assignments complete</div>
      <div class="progress"><span style="width:${p.percent}%"></span></div>
      ${modules.map(m=>{
        const items=as.filter(a=>(a.module||"General")===m);
        return `<div class="module"><strong>${escapeHtml(m)}</strong><div class="small">${items.filter(a=>a.done).length}/${items.length} complete</div></div>`;
      }).join("") || `<div class="empty">No assignments yet.</div>`}
    </section>`;
  }).join("")}</div>`;
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
  const map={
    dashboard:["Dashboard","Your current academic workload, in one place.",dashboard],
    courses:["Courses","Progress by goal and module.",coursesView],
    calendar:["Calendar","All deadlines in chronological order.",calendarView],
    planning:["Planning mode","Adjust deadlines intentionally rather than impulsively.",planningView]
  };
  const [t,s,fn]=map[currentView];
  title.textContent=t; subtitle.textContent=s; app.innerHTML=fn();
  bindDynamic();
}
function bindDynamic(){
  document.querySelectorAll(".toggle-done").forEach(el=>el.addEventListener("change",()=>{
    const a=state.assignments.find(x=>x.id===el.dataset.id); if(a){a.done=el.checked;save();render();}
  }));
  document.querySelectorAll("[data-edit]").forEach(el=>el.addEventListener("click",()=>openDialog(el.dataset.edit)));
  document.querySelectorAll("[data-plan-date]").forEach(el=>el.addEventListener("change",()=>{
    const a=state.assignments.find(x=>x.id===el.dataset.planDate); if(a){a.due=el.value;save();render();}
  }));
  document.querySelectorAll("[data-plan-points]").forEach(el=>el.addEventListener("change",()=>{
    const a=state.assignments.find(x=>x.id===el.dataset.planPoints); if(a){a.points=Math.max(1,Math.min(500,Number(el.value)||1));save();render();}
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
  document.getElementById("moduleInput").value=a?.module||"";
  document.getElementById("notesInput").value=a?.notes||"";
  document.getElementById("deleteAssignmentBtn").classList.toggle("hidden",!a);
  dlg.showModal();
}
function closeDialog(){ document.getElementById("assignmentDialog").close(); }

document.getElementById("courseInput").innerHTML=state.courses.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>{
  currentView=b.dataset.view;
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x===b));
  render();
}));
document.getElementById("addAssignmentBtn").addEventListener("click",()=>openDialog());
document.getElementById("closeDialog").addEventListener("click",closeDialog);
document.getElementById("cancelDialog").addEventListener("click",closeDialog);

document.getElementById("assignmentForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=document.getElementById("assignmentId").value;
  const payload={
    id:id||crypto.randomUUID(),
    title:document.getElementById("titleInput").value.trim(),
    courseId:document.getElementById("courseInput").value,
    due:document.getElementById("dueInput").value,
    points:Math.max(1,Math.min(500,Number(document.getElementById("pointsInput").value)||10)),
    module:document.getElementById("moduleInput").value.trim(),
    notes:document.getElementById("notesInput").value.trim(),
    done:id ? (state.assignments.find(a=>a.id===id)?.done||false) : false
  };
  if(!payload.title||!payload.due)return;
  const idx=state.assignments.findIndex(a=>a.id===payload.id);
  if(idx>=0)state.assignments[idx]=payload; else state.assignments.push(payload);
  save(); closeDialog(); render();
});
document.getElementById("deleteAssignmentBtn").addEventListener("click",()=>{
  const id=document.getElementById("assignmentId").value;
  if(!id)return;
  if(confirm("Delete this assignment?")){
    state.assignments=state.assignments.filter(a=>a.id!==id);
    save(); closeDialog(); render();
  }
});
render();
