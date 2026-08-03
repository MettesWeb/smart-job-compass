
const KEYS = {
  profile: "sjc_profile_v2",
  analysis: "sjc_analysis_v2",
  currentJob: "sjc_current_job_v2",
  savedJobs: "sjc_saved_jobs_v2",
  applications: "sjc_applications_v2"
};

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const profile = () => readJSON(KEYS.profile, {fields:{}, chips:{}, experiences:[], cvFileName:""});

function initMenu(){
  const toggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if(!toggle || !sidebar) return;
  toggle.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    sidebar.classList.remove("open");
    toggle.setAttribute("aria-expanded","false");
  }));
}

function saveAllProfileFields(){
  const data = profile();
  data.fields ||= {};
  document.querySelectorAll("[data-profile-field]").forEach(el => data.fields[el.id] = el.value);
  document.querySelectorAll("[data-chip-group]").forEach(group => {
    data.chips ||= {};
    data.chips[group.dataset.chipGroup] = [...group.querySelectorAll(".chip.selected")].map(x => x.textContent.trim());
  });
  writeJSON(KEYS.profile, data);
  return data;
}

function restoreProfileFields(){
  const data = profile();
  document.querySelectorAll("[data-profile-field]").forEach(el => {
    if(data.fields?.[el.id] !== undefined) el.value = data.fields[el.id];
  });
  document.querySelectorAll("[data-chip-group]").forEach(group => {
    const selected = data.chips?.[group.dataset.chipGroup] || [];
    group.querySelectorAll(".chip").forEach(chip => chip.classList.toggle("selected", selected.includes(chip.textContent.trim())));
  });
  const status = document.getElementById("cvFileStatus");
  if(status && data.cvFileName) status.textContent = `Gespeicherte Datei: ${data.cvFileName}`;
}

function initChips(){
  document.querySelectorAll("[data-chip-group]").forEach(group => {
    const single = group.classList.contains("single-choice");
    group.querySelectorAll(".chip").forEach(chip => chip.addEventListener("click", () => {
      if(single){
        group.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
        chip.classList.add("selected");
      } else {
        chip.classList.toggle("selected");
      }
      saveAllProfileFields();
    }));
  });
}

function initCVUpload(){
  const input = document.getElementById("cvFile");
  const status = document.getElementById("cvFileStatus");
  if(!input || !status) return;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if(!file) return;
    const data = profile();
    data.cvFileName = file.name;
    writeJSON(KEYS.profile, data);
    status.textContent = `Ausgewählt: ${file.name}`;
  });
}

function experienceRow(item={title:"",company:"",period:""}){
  const row = document.createElement("div");
  row.className = "experience-row";
  row.innerHTML = `
    <label>Position<input class="exp-title" type="text" value="${escapeHTML(item.title)}" placeholder="Jobtitel"></label>
    <label>Unternehmen<input class="exp-company" type="text" value="${escapeHTML(item.company)}" placeholder="Unternehmen"></label>
    <label>Zeitraum<input class="exp-period" type="text" value="${escapeHTML(item.period)}" placeholder="2020–2024"></label>
    <button class="remove-row" type="button" aria-label="Berufsstation löschen">×</button>`;
  row.querySelector(".remove-row").addEventListener("click", () => { row.remove(); saveExperiences(); });
  row.querySelectorAll("input").forEach(i => i.addEventListener("change", saveExperiences));
  return row;
}
function saveExperiences(){
  const data = saveAllProfileFields();
  data.experiences = [...document.querySelectorAll(".experience-row")].map(r => ({
    title:r.querySelector(".exp-title").value,
    company:r.querySelector(".exp-company").value,
    period:r.querySelector(".exp-period").value
  }));
  writeJSON(KEYS.profile, data);
}
function initExperiences(){
  const list = document.getElementById("experienceList");
  if(!list) return;
  const data = profile();
  const rows = data.experiences?.length ? data.experiences : [{}];
  rows.forEach(x => list.appendChild(experienceRow(x)));
  document.getElementById("addExperience")?.addEventListener("click", () => list.appendChild(experienceRow()));
}

function escapeHTML(value=""){
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function hasAny(text, terms){ return terms.some(t => text.includes(t)); }
function unique(arr){ return [...new Set(arr.filter(Boolean))]; }

const skillMap = {
  "Customer Support & Customer Success":["customer success","customer support","kundenservice","support","client success","onboarding"],
  "Assistenz & Backoffice":["assistant","assistenz","backoffice","administrative","virtual assistant","office manager"],
  "Content & Social Media":["content","social media","linkedin","tiktok","instagram","copywriting","storytelling","redaktion"],
  "Digital Marketing":["digital marketing","online marketing","marketing","campaign","kampagne","brand"],
  "E-Mail-Marketing & CRM":["email marketing","e-mail-marketing","newsletter","crm","hubspot","mailchimp","klaviyo","lifecycle"],
  "Performance Marketing":["performance marketing","paid media","google ads","meta ads","tiktok ads","ppc"],
  "Influencer & Creator":["influencer","creator","ugc","affiliate","partnership"],
  "Projektkoordination & Operations":["project","projekt","operations","coordination","koordin","stakeholder","prozess","process"],
  "HR & Recruiting":["recruiting","recruiter","talent acquisition","hr ","human resources","employer branding"],
  "AI Training & Prompting":["ai trainer","ai evaluator","prompt writer","data annotation","content reviewer","search quality"],
  "Datenanalyse & Reporting":["data analyst","datenanalyse","reporting","looker","power bi","tableau","sql","dashboard"],
  "KI & Automatisierung":["automation","automatisierung","n8n","make.com","zapier","workflow","llm","chatgpt","gemini"],
  "E-Commerce":["e-commerce","ecommerce","shopify","woocommerce","marketplace","amazon"],
  "Design, Video & UGC":["video editor","graphic design","canva","capcut","premiere","creative strategist","ugc"]
};

function textFromProfile(data){
  return [
    ...(data.experiences||[]).flatMap(x=>[x.title,x.company]),
    ...Object.values(data.fields||{}),
    ...Object.values(data.chips||{}).flat()
  ].join(" ").toLowerCase();
}
function privateText(data){
  return [
    ...(data.chips?.privateProjects||[]),
    data.fields?.privateExperienceText||"",
    data.fields?.portfolioNotes||"",
    data.fields?.portfolioUrl||"",
    data.fields?.githubUrl||"",
    data.fields?.socialUrl||"",
    data.fields?.mediaUrl||""
  ].join(" ").toLowerCase();
}
function wishText(data){
  return [
    ...(data.chips?.desiredFields||[]),
    ...(data.chips?.workModel||[]),
    ...(data.chips?.hours||[]),
    ...(data.chips?.employment||[]),
    ...(data.chips?.companySize||[]),
    ...(data.chips?.experienceLevel||[]),
    data.fields?.otherDesiredField||"",
    data.fields?.otherExclusions||""
  ].join(" ").toLowerCase();
}

function analyzeJob(){
  saveAllProfileFields();
  const jobDescription = document.getElementById("jobDescription")?.value.trim();
  const jobUrl = document.getElementById("jobUrl")?.value.trim() || "";
  if(!jobDescription){ alert("Bitte füge zuerst eine Stellenbeschreibung ein."); return; }

  const data = profile();
  const job = jobDescription.toLowerCase();
  const pText = textFromProfile(data);
  const privText = privateText(data);
  const wText = wishText(data);
  const strengths=[], gaps=[], warnings=[], improvements=[];
  let relevant=0, professionalMatches=0, privateMatches=0, wishMatches=0;

  Object.entries(skillMap).forEach(([label, terms]) => {
    if(hasAny(job,terms)){
      relevant++;
      const professional = hasAny(pText,terms);
      const privateMatch = hasAny(privText,terms);
      const wish = hasAny(wText,terms);
      if(professional){ professionalMatches++; strengths.push(`${label}: im Profil oder Lebenslauf erkennbar.`); }
      else if(privateMatch){ privateMatches++; strengths.push(`${label}: durch private Projekte oder Selbststudium belegt.`); }
      else { gaps.push(`${label}: in der Anzeige verlangt, aber bisher nicht ausreichend belegt.`); }
      if(wish){ wishMatches++; }
    }
  });

  const skillScore = relevant ? Math.round((professionalMatches/relevant)*100) : 50;
  const privateScore = relevant ? Math.round((privateMatches/relevant)*100) : 0;
  const directionScore = relevant ? Math.round((wishMatches/relevant)*100) : 50;

  const workModel = data.chips?.workModel || [];
  let remoteScore = 50;
  if(hasAny(job,["remote","homeoffice","home office","work from home"])){
    remoteScore = workModel.some(x=>["100 % Remote","Homeoffice","Hybrid"].includes(x)) ? 100 : 75;
    strengths.push("Remote- oder Homeoffice-Möglichkeit erkannt.");
  } else if(hasAny(job,["vor ort","onsite","on-site"])){
    remoteScore = workModel.includes("100 % Remote") ? 10 : 45;
    warnings.push("Die Stelle scheint eine Vor-Ort-Pflicht zu enthalten.");
  } else {
    gaps.push("Das Arbeitsmodell ist in der Anzeige nicht eindeutig.");
  }

  const hours = data.chips?.hours || [];
  let hoursScore = 60;
  if(hasAny(job,["vollzeit","full-time","40 hours","40h"])){
    hoursScore = hours.includes("Vollzeit") ? 100 : 25;
    if(!hours.includes("Vollzeit")) warnings.push("Die Stelle ist als Vollzeit ausgeschrieben.");
  } else if(hasAny(job,["teilzeit","part-time","20 hours","25 hours","30 hours"])){
    hoursScore = hours.some(x=>x!=="Vollzeit") ? 95 : 70;
    strengths.push("Teilzeit oder reduzierte Wochenstunden werden erwähnt.");
  }

  let preferenceScore = Math.round((directionScore*0.45)+(remoteScore*0.35)+(hoursScore*0.20));
  const exclusions = data.chips?.exclusions || [];
  const exclusionRules = [
    ["Kaltakquise",["kaltakquise","cold calling","outbound sales"]],
    ["Callcenter",["call center","callcenter"]],
    ["Schichtarbeit",["schicht","shift work","rotating shifts"]],
    ["Wochenendarbeit",["weekend","wochenende"]],
    ["Reisetätigkeit",["travel required","reisebereitschaft","business travel"]],
    ["Nur Provision",["commission only","provision only","nur provision"]],
    ["Führungsverantwortung",["head of","team lead","leadership responsibility","führung"]],
    ["100 % Telefon",["phone-based","telefonisch","calls all day"]],
    ["Vor-Ort-Pflicht",["onsite","vor ort"]],
    ["Ständige Erreichbarkeit",["always available","24/7","ständige erreichbarkeit"]]
  ];
  exclusionRules.forEach(([label,terms])=>{
    if(exclusions.includes(label) && hasAny(job,terms)){
      warnings.push(`${label} wurde erkannt und steht auf deiner Ausschlussliste.`);
      preferenceScore -= 10;
    }
  });
  preferenceScore = Math.max(0,Math.min(100,preferenceScore));

  const documents=["Angepasster Lebenslauf"];
  if(hasAny(job,["anschreiben","cover letter","motivation letter"])) documents.push("Anschreiben");
  if(hasAny(job,["portfolio","arbeitsprobe","work sample"])) documents.push("Portfolio oder Arbeitsprobe");
  if(hasAny(job,["zertifikat","certificate","zeugnisse","references"])) documents.push("Zertifikate oder Zeugnisse");
  if(hasAny(job,["english cv","resume in english","englischer lebenslauf"])) documents.push("Lebenslauf auf Englisch");
  if(documents.length===1) documents.push("Anforderungen an weitere Unterlagen nicht eindeutig");

  if(gaps.some(x=>x.includes("E-Mail-Marketing"))) improvements.push("Ein kleines Newsletter- oder CRM-Projekt sichtbar machen.");
  if(gaps.some(x=>x.includes("Performance Marketing"))) improvements.push("Aktuelles Google- oder Meta-Zertifikat ergänzen.");
  if(gaps.some(x=>x.includes("KI & Automatisierung"))) improvements.push("Einen nachvollziehbaren n8n-, Make- oder KI-Workflow als Projekt dokumentieren.");
  if(gaps.some(x=>x.includes("Content"))) improvements.push("Portfolio mit Blog, Social Media, Video oder Textbeispielen ergänzen.");
  if(privateMatches>0) improvements.push("Private Projekte im Lebenslauf als eigene Rubrik und zusätzlich im Portfolio zeigen.");
  if(!improvements.length) improvements.push("Profil und Portfolio aktuell halten und konkrete Ergebnisse ergänzen.");

  const capability = Math.min(100, Math.round(skillScore*0.72 + privateScore*0.28));
  const overall = Math.round(capability*0.60 + preferenceScore*0.40);
  let recommendation="Momentan eher nicht";
  let summary="Mehrere wichtige Anforderungen oder Rahmenbedingungen passen noch nicht.";
  if(overall>=75){ recommendation="Sofort bewerben"; summary="Die Stelle passt insgesamt gut zu deinen Fähigkeiten, deiner privaten Praxis und deinen Zielen."; }
  else if(overall>=55){ recommendation="Bewerben möglich"; summary="Es gibt gute Überschneidungen, aber auch Lücken oder unklare Punkte."; }

  const current = {
    id:Date.now(), createdAt:new Date().toISOString(), url:jobUrl, description:jobDescription,
    title:extractTitle(jobDescription), overall, skillScore, privateScore, preferenceScore, remoteScore, hoursScore,
    recommendation, summary, strengths:unique(strengths), gaps:unique(gaps), warnings:unique(warnings),
    documents:unique(documents), improvements:unique(improvements)
  };
  writeJSON(KEYS.currentJob,current);
  writeJSON(KEYS.analysis,current);
  location.href="results.html";
}

function extractTitle(text){
  const first = text.split(/\n+/).map(x=>x.trim()).find(x=>x.length>3 && x.length<120);
  return first || "Gespeicherte Stellenanzeige";
}

function setList(id,items){
  const el=document.getElementById(id); if(!el) return;
  el.innerHTML="";
  (items?.length?items:["Keine eindeutigen Angaben erkannt."]).forEach(item=>{
    const li=document.createElement("li"); li.textContent=item; el.appendChild(li);
  });
}

function renderResults(){
  const a=readJSON(KEYS.analysis,null); if(!a) return;
  setText("resultRecommendation",a.recommendation);
  setText("resultSummary",a.summary);
  setText("overallScore",`${a.overall}%`);
  setText("skillScore",`${a.skillScore}%`);
  setText("privateScore",`${a.privateScore}%`);
  setText("preferenceScore",`${a.preferenceScore}%`);
  setText("remoteScore",`${a.remoteScore}%`);
  setText("hoursScore",`${a.hoursScore}%`);
  setList("strengthsList",a.strengths);
  setList("gapsList",a.gaps);
  setList("warningsList",a.warnings);
  setList("documentsList",a.documents);
  setList("improvementsList",a.improvements);
}
function setText(id,text){ const el=document.getElementById(id); if(el) el.textContent=text; }

function saveCurrentJob(){
  const current=readJSON(KEYS.currentJob,null); if(!current){alert("Keine analysierte Stelle vorhanden.");return;}
  const saved=readJSON(KEYS.savedJobs,[]);
  if(!saved.some(x=>x.id===current.id)) saved.unshift(current);
  writeJSON(KEYS.savedJobs,saved);
  alert("Die Stelle wurde gespeichert.");
}
function discardCurrentJob(){
  localStorage.removeItem(KEYS.currentJob);
  localStorage.removeItem(KEYS.analysis);
  localStorage.removeItem("sjc_job_draft");
  location.href="analyze.html";
}
function createApplication(){
  const current=readJSON(KEYS.currentJob,null); if(!current){alert("Keine analysierte Stelle vorhanden.");return;}
  const apps=readJSON(KEYS.applications,[]);
  if(!apps.some(x=>x.jobId===current.id)) apps.unshift({jobId:current.id,createdAt:new Date().toISOString(),job:current});
  writeJSON(KEYS.applications,apps);
  location.href="applications.html";
}

function renderSavedJobs(){
  const el=document.getElementById("savedJobsList"); if(!el) return;
  const saved=readJSON(KEYS.savedJobs,[]);
  if(!saved.length){ el.innerHTML='<article class="glass-card section-card"><h2>Noch keine gespeicherten Jobs</h2><p>Nutze bei einer Analyse den Button „Für später speichern“.</p></article>'; return; }
  el.innerHTML="";
  saved.forEach(job=>{
    const card=document.createElement("article"); card.className="saved-job glass-card";
    card.innerHTML=`<header><div><span class="tag">${escapeHTML(job.recommendation)}</span><h2>${escapeHTML(job.title)}</h2></div><strong>${job.overall}%</strong></header>
      <p>${escapeHTML(job.summary)}</p>
      <div class="page-actions wrap">
        <button class="secondary-button reopen" type="button">Ergebnis öffnen</button>
        <button class="primary-button apply" type="button">Jetzt bewerben</button>
        <button class="secondary-button delete" type="button">Löschen</button>
      </div>`;
    card.querySelector(".reopen").addEventListener("click",()=>{writeJSON(KEYS.currentJob,job);writeJSON(KEYS.analysis,job);location.href="results.html";});
    card.querySelector(".apply").addEventListener("click",()=>{writeJSON(KEYS.currentJob,job);createApplication();});
    card.querySelector(".delete").addEventListener("click",()=>{writeJSON(KEYS.savedJobs,saved.filter(x=>x.id!==job.id));renderSavedJobs();});
    el.appendChild(card);
  });
}

function renderApplication(){
  const current=readJSON(KEYS.currentJob,null);
  const data=profile();
  if(!current) return;
  const desired=(data.chips?.desiredFields||[]).slice(0,3);
  const fields=(data.chips?.careerFields||[]).slice(0,3);
  const tools=(data.chips?.tools||[]).slice(0,10);
  const tasks=(data.chips?.tasks||[]).slice(0,8);
  const privateProjects=(data.chips?.privateProjects||[]).slice(0,8);
  const name=data.fields?.fullName||"Bewerber:in";

  setText("cvHeadlineOutput",`${desired.length?desired.join(" · "):fields.join(" · ")||"Remote Professional"} | ${tools.slice(0,5).join(", ")}`);
  setList("cvPointsOutput", unique([
    ...fields.map(x=>`Erfahrung oder Kenntnisse im Bereich ${x}`),
    ...tasks.map(x=>`Praxis: ${x}`),
    ...tools.map(x=>`Tool/Know-how: ${x}`)
  ]).slice(0,14));

  const priv = privateProjects.length ? ` Zusätzlich habe ich privat praktische Erfahrung mit ${privateProjects.join(", ")} aufgebaut.` : "";
  const cover=`Sehr geehrte Damen und Herren,

die ausgeschriebene Position „${current.title}“ spricht mich an, weil sie sowohl zu meiner bisherigen Erfahrung als auch zu meiner gewünschten beruflichen Entwicklung passt. Zu meinen relevanten Kenntnissen gehören ${[...fields,...tools].slice(0,8).join(", ") || "Organisation, digitale Zusammenarbeit und selbstständiges Arbeiten"}.${priv}

Ich arbeite strukturiert, zuverlässig und lösungsorientiert. Besonders wichtig ist mir, vorhandene Erfahrung mit neuen digitalen Fähigkeiten sinnvoll zu verbinden und mich in einem Remote-Umfeld langfristig weiterzuentwickeln.

Über die Gelegenheit, meine Motivation und meine Arbeitsproben persönlich vorzustellen, freue ich mich.

Mit freundlichen Grüßen
${name}`;
  setText("coverLetterOutput",cover);

  const portfolio=[];
  if(data.fields?.portfolioUrl) portfolio.push(`Portfolio: ${data.fields.portfolioUrl}`);
  if(data.fields?.githubUrl) portfolio.push(`GitHub: ${data.fields.githubUrl}`);
  if(data.fields?.socialUrl) portfolio.push(`Social Media: ${data.fields.socialUrl}`);
  if(data.fields?.mediaUrl) portfolio.push(`Weitere Arbeitsproben: ${data.fields.mediaUrl}`);
  portfolio.push(...(data.chips?.certificates||[]).map(x=>`Zertifikat/Weiterbildung: ${x}`));
  setList("portfolioOutput",portfolio);
}

function initCopyButtons(){
  document.querySelectorAll(".copy-button").forEach(btn=>btn.addEventListener("click",async()=>{
    const target=document.getElementById(btn.dataset.copyTarget);
    if(!target) return;
    await navigator.clipboard.writeText(target.textContent);
    const old=btn.textContent; btn.textContent="Kopiert"; setTimeout(()=>btn.textContent=old,1200);
  }));
}

function updateDashboard(){
  const data=profile();
  const filledFields=Object.values(data.fields||{}).filter(Boolean).length;
  const chipCount=Object.values(data.chips||{}).flat().length;
  const experienceCount=(data.experiences||[]).filter(x=>x.title||x.company).length;
  const percent=Math.min(100,Math.round((filledFields*4)+(chipCount*1.5)+(experienceCount*8)+(data.cvFileName?15:0)));
  setText("dashboardProfile",`${percent}%`);
  setText("dashboardChecked",readJSON(KEYS.analysis,null)?1:0);
  setText("dashboardSaved",String(readJSON(KEYS.savedJobs,[]).length));
  setText("dashboardApplications",String(readJSON(KEYS.applications,[]).length));
}

function initAnalyzePage(){
  const desc=document.getElementById("jobDescription");
  const url=document.getElementById("jobUrl");
  if(!desc) return;
  const draft=readJSON("sjc_job_draft",{});
  desc.value=draft.description||"";
  if(url) url.value=draft.url||"";
  [desc,url].filter(Boolean).forEach(el=>el.addEventListener("input",()=>writeJSON("sjc_job_draft",{description:desc.value,url:url?.value||""})));
  document.getElementById("clearJobButton")?.addEventListener("click",()=>{
    desc.value=""; if(url) url.value=""; writeJSON("sjc_job_draft",{});
    desc.focus();
  });
  document.getElementById("analyzeJobButton")?.addEventListener("click",analyzeJob);
}

function initSettings(){
  document.getElementById("exportDataButton")?.addEventListener("click",()=>{
    const payload={profile:profile(),analysis:readJSON(KEYS.analysis,null),currentJob:readJSON(KEYS.currentJob,null),savedJobs:readJSON(KEYS.savedJobs,[]),applications:readJSON(KEYS.applications,[])};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="smart-job-compass-daten.json"; a.click(); URL.revokeObjectURL(a.href);
  });
  document.getElementById("importDataFile")?.addEventListener("change",async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    try{
      const payload=JSON.parse(await file.text());
      if(payload.profile) writeJSON(KEYS.profile,payload.profile);
      if(payload.analysis) writeJSON(KEYS.analysis,payload.analysis);
      if(payload.currentJob) writeJSON(KEYS.currentJob,payload.currentJob);
      if(payload.savedJobs) writeJSON(KEYS.savedJobs,payload.savedJobs);
      if(payload.applications) writeJSON(KEYS.applications,payload.applications);
      alert("Daten wurden importiert."); location.reload();
    }catch{ alert("Die Datei konnte nicht gelesen werden."); }
  });
  document.getElementById("resetDataButton")?.addEventListener("click",()=>{
    if(!confirm("Wirklich alle lokalen Daten löschen?")) return;
    Object.values(KEYS).forEach(k=>localStorage.removeItem(k));
    localStorage.removeItem("sjc_job_draft");
    alert("Lokale Daten wurden gelöscht."); location.href="index.html";
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  initMenu(); initChips(); restoreProfileFields(); initCVUpload(); initExperiences(); initAnalyzePage();
  document.getElementById("saveProfileButton")?.addEventListener("click",()=>{saveExperiences();alert("Profil gespeichert.");});
  document.getElementById("saveSkillsButton")?.addEventListener("click",()=>{saveAllProfileFields();alert("Fähigkeiten gespeichert.");});
  document.getElementById("saveGoalsButton")?.addEventListener("click",()=>{saveAllProfileFields();alert("Wünsche gespeichert.");});
  renderResults(); renderSavedJobs(); renderApplication(); initCopyButtons(); updateDashboard(); initSettings();
  document.getElementById("saveJobButton")?.addEventListener("click",saveCurrentJob);
  document.getElementById("discardJobButton")?.addEventListener("click",discardCurrentJob);
  document.getElementById("createApplicationButton")?.addEventListener("click",createApplication);
  document.getElementById("newJobLink")?.addEventListener("click",()=>writeJSON("sjc_job_draft",{}));
});
