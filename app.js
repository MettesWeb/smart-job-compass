const panels = [...document.querySelectorAll(".panel")];
const steps = [...document.querySelectorAll(".step")];

function showStep(number) {
  panels.forEach((panel, index) => panel.classList.toggle("active", index === number - 1));
  steps.forEach((step, index) => step.classList.toggle("active", index === number - 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-next]").forEach(button => {
  button.addEventListener("click", () => showStep(Number(button.dataset.next)));
});

document.querySelectorAll("[data-prev]").forEach(button => {
  button.addEventListener("click", () => showStep(Number(button.dataset.prev)));
});

steps.forEach(step => {
  step.addEventListener("click", () => showStep(Number(step.dataset.step)));
});

const cvUpload = document.getElementById("cvUpload");
cvUpload.addEventListener("change", () => {
  const file = cvUpload.files[0];
  document.getElementById("uploadStatus").textContent =
    file ? `Ausgewählt: ${file.name}` : "Noch keine Datei ausgewählt.";
});

const profileFields = [
  "fullName", "targetRoles", "hours", "workModel", "employmentType",
  "salary", "skills", "preferredTasks", "exclusions"
];

function readProfile() {
  const profile = {};
  profileFields.forEach(id => profile[id] = document.getElementById(id).value.trim());
  return profile;
}

function saveProfile() {
  localStorage.setItem("careerBlueprintProfile", JSON.stringify(readProfile()));
}

function loadProfile() {
  const saved = localStorage.getItem("careerBlueprintProfile");
  if (!saved) return;
  const profile = JSON.parse(saved);
  profileFields.forEach(id => {
    if (profile[id] !== undefined) document.getElementById(id).value = profile[id];
  });
}

document.getElementById("saveProfile").addEventListener("click", saveProfile);

function containsAny(text, words) {
  return words.some(word => text.includes(word));
}

function setList(id, items) {
  const list = document.getElementById(id);
  list.innerHTML = "";
  (items.length ? items : ["Keine eindeutigen Angaben erkannt."]).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function analyzeJob() {
  saveProfile();
  const profile = readProfile();
  const job = document.getElementById("jobDescription").value.trim();
  if (!job) {
    alert("Bitte zuerst eine Stellenanzeige einfügen.");
    return;
  }

  const text = job.toLowerCase();
  const profileText = Object.values(profile).join(" ").toLowerCase();

  const keywordGroups = {
    "Content / Social Media": ["content", "social media", "linkedin", "tiktok", "instagram", "copywriting", "storytelling"],
    "KI / Automatisierung": ["ai", "ki", "automation", "automatisierung", "workflow", "n8n", "make", "zapier", "prompt"],
    "Marketing": ["marketing", "campaign", "kampagne", "seo", "google ads", "meta ads", "crm", "newsletter"],
    "Kunden / Kommunikation": ["customer success", "kunden", "client", "support", "stakeholder", "communication"],
    "Projekt / Operations": ["project", "projekt", "operations", "coordination", "koordin", "process", "prozess"]
  };

  const strengths = [];
  const gaps = [];
  let matched = 0;
  let relevant = 0;

  Object.entries(keywordGroups).forEach(([label, words]) => {
    if (containsAny(text, words)) {
      relevant += 1;
      if (containsAny(profileText, words)) {
        matched += 1;
        strengths.push(`${label} ist in deinem Profil erkennbar.`);
      } else {
        gaps.push(`${label} wird verlangt, ist im Profil aber noch nicht klar belegt.`);
      }
    }
  });

  let skillScore = relevant ? Math.round((matched / relevant) * 100) : 50;

  let preferenceScore = 60;
  const warnings = [];

  if (profile.workModel.toLowerCase().includes("remote")) {
    if (containsAny(text, ["remote", "homeoffice", "home office"])) {
      preferenceScore += 20;
      strengths.push("Das Arbeitsmodell passt zu deinem Remote-Wunsch.");
    } else if (containsAny(text, ["vor ort", "onsite", "on-site"])) {
      preferenceScore -= 30;
      warnings.push("Die Stelle scheint vor Ort zu sein.");
    }
  }

  if (containsAny(text, ["vollzeit", "full-time", "40 hours", "40h"])) {
    if (!profile.hours.toLowerCase().includes("vollzeit")) {
      preferenceScore -= 25;
      warnings.push("Die Stelle ist als Vollzeit ausgeschrieben.");
    }
  }

  if (containsAny(text, ["sales", "vertrieb", "kaltakquise", "cold calling"])) {
    if (profile.exclusions.toLowerCase().includes("vertrieb") || profile.exclusions.toLowerCase().includes("kaltakquise")) {
      preferenceScore -= 25;
      warnings.push("Die Anzeige enthält Vertriebs- oder Akquiseaufgaben.");
    }
  }

  if (containsAny(text, ["flexible", "flexibel"])) {
    preferenceScore += 10;
    strengths.push("Flexible Arbeitsbedingungen werden erwähnt.");
  }

  preferenceScore = Math.max(0, Math.min(100, preferenceScore));

  const rawKeywords = [
    "chatgpt", "canva", "capcut", "crm", "seo", "google ads", "meta ads",
    "linkedin", "tiktok", "instagram", "n8n", "make", "zapier", "powerpoint",
    "customer success", "content strategy", "automation", "workflow"
  ];

  const jobKeywords = rawKeywords.filter(k => text.includes(k));
  const matchedKeywords = jobKeywords.filter(k => profileText.includes(k));
  const atsScore = jobKeywords.length
    ? Math.round((matchedKeywords.length / jobKeywords.length) * 100)
    : 55;

  const overall = Math.round(skillScore * 0.55 + preferenceScore * 0.30 + atsScore * 0.15);

  let recommendation = "Eher nicht bewerben";
  if (overall >= 75) recommendation = "Bewerben";
  else if (overall >= 55) recommendation = "Stretch – Bewerbung möglich";

  const documents = ["Angepasster Lebenslauf", "Individuelles Anschreiben"];
  if (containsAny(text, ["portfolio", "arbeitsprobe", "work sample"])) documents.push("Portfolio oder Arbeitsprobe");
  if (containsAny(text, ["certificate", "zertifikat", "zeugnis"])) documents.push("Relevante Zertifikate");

  document.getElementById("recommendation").textContent = recommendation;
  document.getElementById("overallScore").textContent = `${overall}%`;
  document.getElementById("skillScore").textContent = `${skillScore}%`;
  document.getElementById("preferenceScore").textContent = `${preferenceScore}%`;
  document.getElementById("atsScore").textContent = `${atsScore}%`;

  setList("strengths", [...new Set(strengths)]);
  setList("gaps", [...new Set(gaps)]);
  setList("warnings", [...new Set(warnings)]);
  setList("documents", documents);

  localStorage.setItem("careerBlueprintLastJob", job);
  localStorage.setItem("careerBlueprintLastAnalysis", JSON.stringify({
    overall, skillScore, preferenceScore, atsScore, recommendation,
    strengths, gaps, warnings, documents
  }));

  showStep(4);
}

document.getElementById("analyzeJob").addEventListener("click", analyzeJob);

document.getElementById("archiveJob").addEventListener("click", () => {
  const archive = JSON.parse(localStorage.getItem("careerBlueprintArchive") || "[]");
  archive.push({
    date: new Date().toISOString(),
    job: localStorage.getItem("careerBlueprintLastJob") || "",
    analysis: JSON.parse(localStorage.getItem("careerBlueprintLastAnalysis") || "{}")
  });
  localStorage.setItem("careerBlueprintArchive", JSON.stringify(archive));
  document.getElementById("jobDescription").value = "";
  alert("Die Stelle wurde lokal archiviert.");
  showStep(3);
});

document.getElementById("createApplication").addEventListener("click", () => {
  const profile = readProfile();
  const analysis = JSON.parse(localStorage.getItem("careerBlueprintLastAnalysis") || "{}");
  const draft = document.getElementById("applicationDraft");

  document.getElementById("cvHeadline").textContent =
    `${profile.targetRoles || "Digital Professional"} | ${profile.skills || "Relevant skills based on the role"}`;

  document.getElementById("coverLetter").textContent =
    `Dear Hiring Team, I am interested in this position because it matches my background in ${profile.targetRoles || "digital work and project coordination"}. ` +
    `My experience includes ${profile.skills || "relevant tools and professional experience"}, and I work independently, reliably, and with a strong focus on practical results. ` +
    `I would welcome the opportunity to contribute my experience and continue developing in this role.`;

  draft.classList.remove("hidden");
});

loadProfile();
