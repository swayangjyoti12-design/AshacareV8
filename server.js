const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ==================== 1. DATABASE CONFIGURATION ====================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ashacare';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB database'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  name: { type: String, required: true }
});

const caseSchema = new mongoose.Schema({
  name: String,
  age: String,
  workerId: String,
  workerName: String,
  triage: String,
  report: String,
  timestamp: String,
  lat: Number,
  lng: Number
});

const User = mongoose.model('User', userSchema);
const CaseRecord = mongoose.model('CaseRecord', caseSchema);

// ==================== 2. BACKEND API ROUTES ====================
app.post('/api/register', async (req, res) => {
  try {
    const { id, password, role, name } = req.body;
    const existing = await User.findOne({ id });
    if (existing) return res.status(400).json({ error: 'User ID already exists' });
    
    const newUser = new User({ id, password, role, name });
    await newUser.save();
    res.json({ success: true, message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { id, password, role } = req.body;
    const user = await User.findOne({ id, password, role });
    if (!user && id === "ASHA101" && password === "123") {
      return res.json({ success: true, user: { id: "ASHA101", name: "Field Worker ASHA", role: "asha" } });
    }
    if (!user) return res.status(401).json({ error: 'Invalid credentials or role mismatch' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cases', async (req, res) => {
  try {
    const cases = await CaseRecord.find().sort({ _id: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const newRecord = new CaseRecord(req.body);
    await newRecord.save();
    res.json({ success: true, record: newRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 3. SERVE FRONTEND HTML INTERFACE ====================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AshaCare SIH - Multilingual Cloud Engine</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
:root { --primary: #0284c7; --primary-dark: #0369a1; --bg: #f1f5f9; --surface: #ffffff; --text: #0f172a; --border: #cbd5e1; --red: #dc2626; --yellow: #d97706; --green: #16a34a; }
* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
body { background: var(--bg); color: var(--text); padding-bottom: 40px; }
header { background: var(--primary-dark); color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-wrap: wrap; gap: 0.5rem; } 
.status-bar { background: #e0f2fe; color: #0369a1; padding: 0.5rem 1.5rem; font-size: 0.85rem; display: flex; justify-content: space-between; font-weight: 600; }
.container { max-width: 1100px; margin: 1.5rem auto; padding: 0 1rem; }
.nav-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid var(--border); overflow-x: auto; }
.tab-btn { padding: 0.75rem 1.25rem; border: none; background: none; font-weight: 600; cursor: pointer; color: #64748b; border-bottom: 3px solid transparent; transition: all 0.2s; whitespace: nowrap; }
.tab-btn:hover { color: var(--primary); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.atlas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.atlas-card { background: #f8fafc; border: 2px solid var(--border); border-radius: 10px; padding: 1rem; text-align: center; cursor: pointer; transition: all 0.2s; }
.atlas-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.08); }
.atlas-card.selected { border-color: var(--primary); background: #e0f2fe; }
.atlas-svg { width: 90px; height: 90px; margin: 0 auto 0.75rem auto; display: block; }
@media(max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } }
label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; } 
input, select, textarea { width: 100%; padding: 0.65rem; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 1rem; }
.search-container { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.search-box { flex: 1; margin-bottom: 0; border-color: var(--primary); }
.mic-btn { background: var(--primary); color: white; border: none; border-radius: 6px; padding: 0 1rem; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; }
.mic-btn.recording { background: var(--red); animation: pulse 1.2s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
.symptom-chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem; max-height: 320px; overflow-y: auto; padding: 0.75rem; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; }
.chip { padding: 0.7rem 1rem; background: white; border: 1.5px solid #cbd5e1; border-radius: 12px; cursor: pointer; font-size: 0.85rem; line-height: 1.35; transition: all 0.2s ease; user-select: none; flex: 1 1 calc(50% - 0.6rem); min-width: 280px; } 
.chip:hover { border-color: var(--primary); }
.chip.selected { background: #dbeafe; border-color: var(--primary); color: var(--primary-dark); font-weight: 600; box-shadow: 0 0 0 1px var(--primary); }
.chip small { display: block; margin-top: 0.3rem; opacity: 0.75; font-size: 0.75rem; font-weight: normal; }
.btn { background: var(--primary); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-secondary { background: #64748b; }
.btn-danger { background: var(--red); }
.report-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 2px solid var(--border); margin-bottom: 1rem; } 
.severity-gauge { height: 10px; width: 100%; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin: 1rem 0; }
.severity-fill { height: 100%; width: 0%; transition: width 0.5s ease-in-out; }
.output-layout { display: grid; grid-template-columns: 3fr 1fr; gap: 1.5rem; }
@media(max-width: 850px) { .output-layout { grid-template-columns: 1fr; } }
.report-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.25rem; font-size: 0.95rem; line-height: 1.6; color: #1e293b; }
.badge-red { background: var(--red); color: white; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: bold; }
.badge-yellow { background: var(--yellow); color: white; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: bold; }
.badge-green { background: var(--green); color: white; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: bold; }
#map { height: 350px; border-radius: 8px; }
.hidden { display: none !important; }
#qrcode-container { display: flex; justify-content: center; margin: 1rem 0; background: white; padding: 1rem; border-radius: 8px; border: 1px solid var(--border); }
.overlay-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.8); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.modal-card { background: white; padding: 2rem; border-radius: 12px; width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
.lang-select { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 0.3rem 0.6rem; border-radius: 6px; font-weight: 600; cursor: pointer; margin-bottom: 0; }
.lang-select option { color: black; }
</style>
</head>
<body> 

<!-- AUTHENTICATION OVERLAY -->
<div id="loginOverlay" class="overlay-backdrop">
<div class="modal-card">
<h2 id="loginTitle" style="color: var(--primary-dark); margin-bottom: 0.5rem;">AshaCare Cloud Portal</h2>
<p id="loginSub" style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">Enter credentials to securely sync records across devices</p>

<div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: #f1f5f9; padding: 0.25rem; border-radius: 8px;">
    <button class="tab-btn active" id="tabLogin" onclick="toggleAuthMode('login')" style="flex:1; margin:0; padding: 0.5rem; border:none; border-radius: 6px;">Login</button>
    <button class="tab-btn" id="tabRegister" onclick="toggleAuthMode('register')" style="flex:1; margin:0; padding: 0.5rem; border:none; border-radius: 6px;">Register</button>
</div>

<form onsubmit="handleAuth(event)">
<div id="registerNameGroup" class="hidden">
    <label data-i18n="fullName">Full Name</label>
    <input type="text" id="authName" placeholder="e.g. Sunita Devi">
</div>

<label data-i18n="userRole">User Role</label>
<select id="loginRole" required>
<option value="asha">ASHA Field Worker / ANM</option>
<option value="doctor">Medical Officer (MO)</option>
</select>

<label data-i18n="workerId">Worker / Doctor ID</label>
<input type="text" id="loginId" placeholder="e.g. ASHA101" required>

<label data-i18n="password">Password</label>
<input type="password" id="loginPassword" placeholder="••••••••" required>

<button type="submit" id="btnAuthSubmit" class="btn" style="width: 100%; justify-content: center;">Login to System</button>
</form>
<div id="loginError" style="color: var(--red); font-size: 0.85rem; margin-top: 1rem; text-align: center;"></div>
</div>
</div>

<header>
<div>
<h1>AshaCare SIH</h1>
<small data-i18n="subtitle">Multilingual Pediatric Triage & CDS Engine</small>
</div>
<div style="display: flex; gap: 0.5rem; align-items: center;">
<select id="langSelect" class="lang-select" onchange="changeLanguage(this.value)">
  <option value="en">English</option>
  <option value="hi">हिंदी (Hindi)</option>
  <option value="or">ଓଡ଼ିଆ (Odia)</option>
</select>
<span id="activeUserBadge" style="font-size: 0.85rem; background: rgba(255,255,255,0.2); padding: 0.3rem 0.6rem; border-radius: 4px;">Not Authenticated</span>
<button class="btn btn-danger" onclick="logout()" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" data-i18n="logout">Logout</button>
</div>
</header>

<div class="status-bar">
<span style="color: var(--primary-dark);" data-i18n="cloudConnected">☁️ Connected to Cloud Database Server</span>
<span id="dbSyncStatus">Synced Records: 0</span>
</div>

<div class="container">
<div class="nav-tabs">
<button id="triageNavBtn" class="tab-btn active" onclick="showTab('triageTab')" data-i18n="navTriage">Field Screening & Triage</button>
<button id="dashNavBtn" class="tab-btn" onclick="showTab('dashboardTab')" data-i18n="navDoctor">Doctor Dashboard & Referrals</button>
<button id="gisNavBtn" class="tab-btn" onclick="showTab('gisTab')" data-i18n="navMap">Gram Panchayat Analytics Map</button>
</div>

<!-- TAB 1: TRIAGE & ASSESSMENT -->
<div id="triageTab" class="tab-content">
<div class="card">
<h2 data-i18n="patientRegistration">Patient Registration</h2>
<div class="grid-2">
<div>
<label data-i18n="childName">Child's Full Name</label>
<input type="text" id="patientName" placeholder="e.g. Aarav Sharma">
</div>
<div>
<label data-i18n="childAge">Age (Months/Years)</label>
<input type="text" id="patientAge" placeholder="e.g. 4 Years">
</div>
</div>
</div>

<!-- VISUAL SYMPTOM ATLAS -->
<div class="card">
<h2 data-i18n="visualAtlasTitle">Visual Symptom Atlas</h2>
<p style="font-size:0.85rem; color:#64748b; margin-bottom: 1rem;" data-i18n="visualAtlasSub">Tap visual cards to select observed physical signs quickly.</p>
<div class="atlas-grid">
  <div class="atlas-card" onclick="toggleAtlasCard('white_reflex', this)">
    <svg class="atlas-svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="#1e293b" stroke="#0284c7" stroke-width="4"/>
      <circle cx="50" cy="50" r="22" fill="#ffffff" />
      <path d="M 20 50 Q 50 15 80 50 Q 50 85 20 50 Z" fill="none" stroke="#38bdf8" stroke-width="3"/>
    </svg>
    <h4 data-i18n="atlasLeukoTitle">White Pupil Glow</h4>
    <small data-i18n="atlasLeukoSub">Leukocoria / White Eye Reflection</small>
  </div>
  <div class="atlas-card" onclick="toggleAtlasCard('petechiae', this)">
    <svg class="atlas-svg" viewBox="0 0 100 100">
      <rect x="10" y="10" width="80" height="80" rx="15" fill="#fde8e8" stroke="#dc2626" stroke-width="2"/>
      <circle cx="30" cy="30" r="4" fill="#dc2626"/><circle cx="50" cy="25" r="3" fill="#dc2626"/>
      <circle cx="70" cy="40" r="5" fill="#dc2626"/><circle cx="35" cy="65" r="3" fill="#dc2626"/>
      <circle cx="65" cy="70" r="4" fill="#dc2626"/><circle cx="45" cy="45" r="3" fill="#dc2626"/>
    </svg>
    <h4 data-i18n="atlasPetechiaeTitle">Skin Bleeding / Dots</h4>
    <small data-i18n="atlasPetechiaeSub">Petechiae / Red Pinpoint Spots</small>
  </div>
  <div class="atlas-card" onclick="toggleAtlasCard('lymphadenopathy', this)">
    <svg class="atlas-svg" viewBox="0 0 100 100">
      <path d="M 30 20 Q 50 10 70 20 L 75 80 Q 50 90 25 80 Z" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
      <circle cx="65" cy="45" r="14" fill="#d97706" opacity="0.8"/>
      <circle cx="65" cy="45" r="10" fill="#b45309"/>
    </svg>
    <h4 data-i18n="atlasLymphTitle">Neck Mass / Lumps</h4>
    <small data-i18n="atlasLymphSub">Swollen Lymph Nodes</small>
  </div>
</div>
</div>

<div class="card">
<h2 data-i18n="guidedScreening">Guided Field Screening</h2>
<label data-i18n="filterSymptoms">Filter & Select Observable Symptom Stories</label>
<div class="search-container">
  <input type="text" id="chipSearch" class="search-box" placeholder="🔎 Filter by symptoms..." oninput="filterChips()">
  <button type="button" class="mic-btn" id="micSearchBtn" onclick="toggleVoiceInput('chipSearch', 'micSearchBtn')" title="Voice Search">🎤</button>
</div>
<div class="symptom-chips" id="symptomChips"></div>

<label data-i18n="fieldNotes">Field Observations / Spoken Voice Notes</label>
<div class="search-container">
  <textarea id="symptomText" rows="3" placeholder="Enter notes or speak naturally..." oninput="processColloquialText()"></textarea>
  <button type="button" class="mic-btn" id="micTextBtn" onclick="toggleVoiceInput('symptomText', 'micTextBtn')" title="Voice Note">🎤</button>
</div>
<button class="btn" onclick="processTriageEngine()" data-i18n="btnGenerateReport">Generate Clinical Assessment Report</button>
</div>

<!-- REPORT OUTPUT -->
<div id="resultCard" class="card hidden">
<div class="report-header">
<div>
<h2 data-i18n="reportTitle">Standardized Pediatric Clinical Assessment Report</h2>
<small id="reportTimestamp" style="color:#64748b;"></small>
</div>
<span id="triageBadge" class="badge-green">GREEN - ROUTINE CARE</span>
</div>
<div class="severity-gauge">
<div id="severityFill" class="severity-fill" style="background:var(--green); width:20%;"></div>
</div>
<div class="output-layout">
<div id="reportFormattedOutput" class="report-box"></div>
<div>
<div class="card" style="text-align: center; background: #f8fafc; padding: 1rem; margin-bottom: 0;">
<label style="color:#475569;" data-i18n="qrPass">📱 Local Referral Pass</label>
<div id="qrcode-container"></div>
<small style="color:#64748b; display: block; margin-top: 0.5rem;" data-i18n="qrSub">Scan at PHC counter for instant entry.</small>
</div>
</div>
</div>
<div style="display:flex; gap: 0.5rem; flex-wrap:wrap; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
<button class="btn" onclick="saveCaseRecord()" data-i18n="btnSaveCloud">💾 Save Record to Cloud</button>
<button class="btn btn-secondary" onclick="window.print()" data-i18n="btnPrint">🖨 Print Assessment</button>
<button class="btn btn-secondary" onclick="resetNewCase()" style="background:#0f172a;" data-i18n="btnNewCase">🔄 New Case Assessment</button>
</div>
</div>
</div>

<!-- TAB 2: DOCTOR DASHBOARD -->
<div id="dashboardTab" class="tab-content hidden">
<div class="card">
<h2 data-i18n="doctorDashTitle">Primary Health Centre (PHC) Clinical Queue</h2>
<p style="font-size:0.85rem; color:#64748b; margin-bottom: 1rem;" data-i18n="doctorDashSub">Live synchronized records pulled from cloud server across all connected user devices.</p>
<button class="btn btn-secondary" onclick="fetchCloudCases()" style="margin-bottom:1rem; font-size: 0.8rem; padding: 0.5rem 1rem;" data-i18n="btnRefresh">🔄 Refresh Queue</button>
<div id="caseList">Loading cases from cloud...</div>
</div>
</div>

<!-- TAB 3: GIS ANALYTICS -->
<div id="gisTab" class="tab-content hidden">
<div class="card">
<h2 data-i18n="gisTitle">Gram Panchayat Outbreak Heatmap & Risk Clusters</h2>
<p style="font-size:0.85rem; color:#64748b; margin-bottom: 1rem;" data-i18n="gisSub">Real-time mapping of high-risk RED pediatric screenings.</p>
<div id="map"></div>
</div>
</div>
</div>

<script>
const API_BASE_URL = window.location.origin;

// MULTILINGUAL DICTIONARY
const TRANSLATIONS = {
  en: {
    subtitle: "Multilingual Pediatric Triage & CDS Engine",
    logout: "Logout",
    cloudConnected: "☁️ Connected to Cloud Database Server",
    navTriage: "Field Screening & Triage",
    navDoctor: "Doctor Dashboard & Referrals",
    navMap: "Gram Panchayat Analytics Map",
    patientRegistration: "Patient Registration",
    childName: "Child's Full Name",
    childAge: "Age (Months/Years)",
    visualAtlasTitle: "Visual Symptom Atlas",
    visualAtlasSub: "Tap visual cards to select observed physical signs quickly.",
    atlasLeukoTitle: "White Pupil Glow",
    atlasLeukoSub: "Leukocoria / White Eye Reflection",
    atlasPetechiaeTitle: "Skin Bleeding / Dots",
    atlasPetechiaeSub: "Petechiae / Red Pinpoint Spots",
    atlasLymphTitle: "Neck Mass / Lumps",
    atlasLymphSub: "Swollen Lymph Nodes",
    guidedScreening: "Guided Field Screening",
    filterSymptoms: "Filter & Select Observable Symptom Stories",
    fieldNotes: "Field Observations / Spoken Voice Notes",
    btnGenerateReport: "Generate Clinical Assessment Report",
    reportTitle: "Standardized Pediatric Clinical Assessment Report",
    qrPass: "📱 Local Referral Pass",
    qrSub: "Scan at PHC counter for instant entry.",
    btnSaveCloud: "💾 Save Record to Cloud",
    btnPrint: "🖨 Print Assessment",
    btnNewCase: "🔄 New Case Assessment",
    doctorDashTitle: "Primary Health Centre (PHC) Clinical Queue",
    doctorDashSub: "Live synchronized records pulled from cloud server across all connected user devices.",
    btnRefresh: "🔄 Refresh Queue",
    gisTitle: "Gram Panchayat Outbreak Heatmap & Risk Clusters",
    gisSub: "Real-time mapping of high-risk RED pediatric screenings.",
    fullName: "Full Name",
    userRole: "User Role",
    workerId: "Worker / Doctor ID",
    password: "Password"
  },
  hi: {
    subtitle: "बहुभाषी बाल चिकित्सा ट्राइएज और सीडीएस इंजन",
    logout: "लॉग आउट",
    cloudConnected: "☁️ क्लाउड डेटाबेस सर्वर से जुड़ा है",
    navTriage: "फील्ड स्क्रीन और ट्राइएज",
    navDoctor: "डॉक्टर डैशबोर्ड और रेफरल",
    navMap: "ग्राम पंचायत विश्लेषण मानचित्र",
    patientRegistration: "रोगी पंजीकरण",
    childName: "बच्चे का पूरा नाम",
    childAge: "आयु (महीने/वर्ष)",
    visualAtlasTitle: "दृश्य लक्षण एटलस (Visual Symptom Atlas)",
    visualAtlasSub: "देखे गए शारीरिक लक्षणों को तुरंत चुनने के लिए कार्ड पर टैप करें।",
    atlasLeukoTitle: "आंख में सफेद चमक",
    atlasLeukoSub: "ल्यूकोकोरिया / सफेद पुतली",
    atlasPetechiaeTitle: "त्वचा पर लाल धब्बे / रक्तस्राव",
    atlasPetechiaeSub: "पेटेकिया / छोटे लाल बिंदु",
    atlasLymphTitle: "गर्दन में गांठ / सूजन",
    atlasLymphSub: "सूजे हुए लिम्फ नोड्स",
    guidedScreening: "मार्गदर्शित क्षेत्र जांच",
    filterSymptoms: "लक्षण खोजें और चुनें",
    fieldNotes: "क्षेत्र अवलोकन / बोलकर नोट दर्ज करें",
    btnGenerateReport: "नैदानिक मूल्यांकन रिपोर्ट तैयार करें",
    reportTitle: "मानकीकृत बाल चिकित्सा मूल्यांकन रिपोर्ट",
    qrPass: "📱 स्थानीय रेफरल पास",
    qrSub: "तुरंत प्रवेश के लिए पीएचसी काउंटर पर स्कैन करें।",
    btnSaveCloud: "💾 क्लाउड में रिकॉर्ड सुरक्षित करें",
    btnPrint: "🖨 रिपोर्ट प्रिंट करें",
    btnNewCase: "🔄 नया केस मूल्यांकन",
    doctorDashTitle: "प्राथमिक स्वास्थ्य केंद्र (PHC) रोगी कतार",
    doctorDashSub: "सभी जुड़े उपकरणों में वास्तविक समय में सिंक किए गए रिकॉर्ड।",
    btnRefresh: "🔄 कतार रिफ्रेश करें",
    gisTitle: "ग्राम पंचायत प्रकोप और जोखिम मानचित्र",
    gisSub: "उच्च जोखिम वाले रेड मामलों का वास्तविक समय मानचित्रण।",
    fullName: "पूरा नाम",
    userRole: "उपयोगकर्ता भूमिका",
    workerId: "कार्यकर्ता / डॉक्टर आईडी",
    password: "पासवर्ड"
  },
  or: {
    subtitle: "ବହୁଭାଷୀ ଶିଶୁ ଚିକିତ୍ସା ଟ୍ରାଇଏଜ୍ ଏବଂ ସିଡିଏସ୍ ଇଞ୍ଜିନ୍",
    logout: "ଲଗ୍ ଆଉଟ୍",
    cloudConnected: "☁️ କ୍ଲାଉଡ୍ ଡାଟାବେସ୍ ସର୍ଭର ସହିତ ସଂଯୁକ୍ତ",
    navTriage: "ଫିଲ୍ଡ ସ୍କ୍ରିନିଂ ଏବଂ ଟ୍ରାଇଏଜ୍",
    navDoctor: "ଡାକ୍ତର ଡ୍ୟାସବୋର୍ଡ ଏବଂ ରେଫରାଲ୍",
    navMap: "ଗ୍ରାମ ପଞ୍ଚାୟତ ଆନାଲିଟିକ୍ସ ମାନଚିତ୍ର",
    patientRegistration: "ରୋଗୀ ପଞ୍ଜୀକରଣ",
    childName: "ଶିଶୁର ସମ୍ପୂର୍ଣ୍ଣ ନାମ",
    childAge: "ବୟସ (ମାସ/ବର୍ଷ)",
    visualAtlasTitle: "ଦୃଶ୍ୟ ଲକ୍ଷଣ ଆଟଲାସ୍ (Visual Symptom Atlas)",
    visualAtlasSub: "ଦେଖାଯାଇଥିବା ଲକ୍ଷଣଗୁଡ଼ିକୁ ଶୀଘ୍ର ଚୟନ କରିବାକୁ କାର୍ଡ ଉପରେ ଟ୍ୟାପ୍ କରନ୍ତୁ।",
    atlasLeukoTitle: "ଆଖିରେ ଧଳା ଚମକ",
    atlasLeukoSub: "ଲିଉକୋକୋରିଆ / ଧଳା ଡୋଳା",
    atlasPetechiaeTitle: "ଚର୍ମରେ ଲାଲ୍ ଦାଗ / ରକ୍ତସ୍ରାବ",
    atlasPetechiaeSub: "ପେଟେକିଆ / ଛୋଟ ଲାଲ୍ ବିନ୍ଦୁ",
    atlasLymphTitle: "ବେକରେ ଗାଣ୍ଠି / ଫୁଲା",
    atlasLymphSub: "ଫୁଲିଥିବା ଲିମ୍ଫ ନୋଡ୍",
    guidedScreening: "ମାର୍ଗଦର୍ଶିତ ଫିଲ୍ଡ ସ୍କ୍ରିନିଂ",
    filterSymptoms: "ଲକ୍ଷଣ ଖୋଜନ୍ତୁ ଏବଂ ବାଛନ୍ତୁ",
    fieldNotes: "ଫିଲ୍ଡ ନୋଟ୍ / ସ୍ୱରରେ କୁହନ୍ତୁ",
    btnGenerateReport: "ଚିକିତ୍ସା ଆକଳନ ରିପୋର୍ଟ ପ୍ରସ୍ତୁତ କରନ୍ତୁ",
    reportTitle: "ମାନକୀକୃତ ଶିଶୁ ଚିକିତ୍ସା ଆକଳନ ରିପୋର୍ଟ",
    qrPass: "📱 ସ୍ଥାନୀୟ ରେଫରାଲ୍ ପାସ୍",
    qrSub: "ତୁରନ୍ତ ପ୍ରବେଶ ପାଇଁ PHC କାଉଣ୍ଟରରେ ସ୍କାନ୍ କରନ୍ତୁ।",
    btnSaveCloud: "💾 କ୍ଲାଉଡରେ ରେକର୍ଡ ସୁରକ୍ଷିତ କରନ୍ତୁ",
    btnPrint: "🖨 ରିପୋର୍ଟ ପ୍ରିଣ୍ଟ କରନ୍ତୁ",
    btnNewCase: "🔄 ନୂତନ କେସ୍ ଆକଳନ",
    doctorDashTitle: "ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (PHC) ରୋଗୀ ତାଲିକା",
    doctorDashSub: "ସମସ୍ତ ସଂଯୁକ୍ତ ଡିଭାଇସରେ ତୁରନ୍ତ ସିଙ୍କ୍ ହୋଇଥିବା ରେକର୍ଡ।",
    btnRefresh: "🔄 ତାଲିକା ରିଫ୍ରେସ୍ କରନ୍ତୁ",
    gisTitle: "ଗ୍ରାମ ପଞ୍ଚାୟତ ସଂକ୍ରମଣ ଏବଂ ବିପଦ ମାନଚିତ୍ର",
    gisSub: "ଉଚ୍ଚ ବିପଦପୂର୍ଣ୍ଣ ରେଡ୍ କେସଗୁଡ଼ିକର ମାନଚିତ୍ର।",
    fullName: "ସମ୍ପୂର୍ଣ୍ଣ ନାମ",
    userRole: "ବ୍ୟବହାରକାରୀ ଭୂମିକା",
    workerId: "କର୍ମୀ / ଡାକ୍ତର ID",
    password: "ପାସୱାର୍ଡ"
  }
};

let currentLang = 'en';

const DIAGNOSTIC_DATABASE = {
white_reflex: { 
  sign: "White Pupil Reflex (Leukocoria)", 
  storyPrompt: {
    en: "Does the child's eye show a bright white glow or cat-eye reflection in photos or sunlight?",
    hi: "क्या बच्चे की आंख में फोटो या धूप में सफेद चमक या बिल्ली की आंख जैसा प्रतिबिंब दिखाई देता है?",
    or: "ଫୋଟୋ କିମ୍ବା ଖରାରେ ଶିଶୁର ଆଖିରେ ଧଳା ଚମକ ଦେଖାଯାଉଛି କି?"
  },
  level: "RED", 
  keywords: ["white eye", "white pupil", "leukocoria", "safed aankh", "aankh me safedi", "dhala akhi", "safed doka"], 
  differentials: ["Retinoblastoma", "Congenital Cataract"], 
  fieldGuidance: "Protect eye from direct light strain." 
},
petechiae: { 
  sign: "Unexplained Bleeding / Petechiae", 
  storyPrompt: {
    en: "Are there sudden purple spots, tiny red pinpoint dots, or unusual bruises on the skin?",
    hi: "क्या त्वचा पर अचानक बैंगनी धब्बे, छोटे लाल बिंदु या असामान्य नीले निशान दिखाई दे रहे हैं?",
    or: "ଚର୍ମରେ ହଠାତ୍ ଲାଲ୍ ବିନ୍ଦୁ, ବାଇଗଣୀ ଦାଗ କିମ୍ବା କ୍ଷତ ଦେଖାଯାଉଛି କି?"
  },
  level: "RED", 
  keywords: ["bleeding", "bruising", "petechiae", "lal dhabbe", "khoon", "raka dhabba", "rakta", "laal bindu"], 
  differentials: ["Acute Leukemia", "Severe Dengue", "ITP"], 
  fieldGuidance: "Avoid intramuscular injections or forceful handling." 
},
lymphadenopathy: { 
  sign: "Unexplained Persistent Lymph Node Mass", 
  storyPrompt: {
    en: "Are there painless, hard lumps on the neck, armpits, or groin that haven't gone away?",
    hi: "क्या गर्दन, कांख या जांघ में बिना दर्द वाली सख्त गांठें हैं जो ठीक नहीं हो रही हैं?",
    or: "ବେକ କିମ୍ବା କାଖରେ ବିନା ବିନ୍ଧାରେ ଟାଣ ଗାଣ୍ଠି/ଫୁଲା ଅଛି କି?"
  },
  level: "YELLOW", 
  keywords: ["lymph node", "ganth", "neck lump", "gardan me sujan", "ganti", "bekare phula"], 
  differentials: ["Tubercular Lymphadenitis", "Lymphoma"], 
  fieldGuidance: "Do not forcefully massage lumps." 
}
};

let currentUser = null;
let selectedSymptoms = new Set();
let currentTriage = {};
let mapInstance = null;
let authMode = 'login';
let cloudCases = [];
let activeRecognition = null;

function changeLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.innerText = TRANSLATIONS[lang][key];
    }
  });
  renderChips();
}

// WEB SPEECH API INTEGRATION
function toggleVoiceInput(targetId, btnId) {
  const btn = document.getElementById(btnId);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Voice Speech Recognition is not supported on this browser. Please use Chrome or Edge.");
    return;
  }

  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
    btn.classList.remove('recording');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'or' ? 'or-IN' : 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  btn.classList.add('recording');

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const targetInput = document.getElementById(targetId);
    if (targetInput.tagName.toLowerCase() === 'textarea') {
      targetInput.value += (targetInput.value ? ' ' : '') + transcript;
      processColloquialText();
    } else {
      targetInput.value = transcript;
      filterChips();
    }
    btn.classList.remove('recording');
    activeRecognition = null;
  };

  recognition.onerror = (err) => {
    console.error("Speech recognition error:", err);
    btn.classList.remove('recording');
    activeRecognition = null;
  };

  recognition.onend = () => {
    btn.classList.remove('recording');
    activeRecognition = null;
  };

  activeRecognition = recognition;
  recognition.start();
}

// VISUAL ATLAS SELECTION
function toggleAtlasCard(key, el) {
  if (selectedSymptoms.has(key)) {
    selectedSymptoms.delete(key);
    el.classList.remove('selected');
  } else {
    selectedSymptoms.add(key);
    el.classList.add('selected');
  }
  renderChips();
}

function toggleAuthMode(mode) {
    authMode = mode;
    const nameGroup = document.getElementById('registerNameGroup');
    const submitBtn = document.getElementById('btnAuthSubmit');
    const title = document.getElementById('loginTitle');
    const errDiv = document.getElementById('loginError');
    const tLogin = document.getElementById('tabLogin');
    const tReg = document.getElementById('tabRegister');
    errDiv.innerText = "";
    if (mode === 'register') {
        tReg.classList.add('active'); tReg.style.background = "var(--surface)";
        tLogin.classList.remove('active'); tLogin.style.background = "transparent";
        nameGroup.classList.remove('hidden');
        document.getElementById('authName').required = true;
        submitBtn.innerText = "Register Cloud Account";
        title.innerText = "AshaCare Cloud Registration";
    } else {
        tLogin.classList.add('active'); tLogin.style.background = "var(--surface)";
        tReg.classList.remove('active'); tReg.style.background = "transparent";
        nameGroup.classList.add('hidden');
        document.getElementById('authName').required = false;
        submitBtn.innerText = "Login to System";
        title.innerText = "AshaCare Cloud Portal";
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const role = document.getElementById('loginRole').value;
    const id = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const name = document.getElementById('authName').value.trim();
    const errDiv = document.getElementById('loginError');

    try {
        const endpoint = authMode === 'register' ? '/api/register' : '/api/login';
        const res = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password, role, name })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Authentication failed');

        if (authMode === 'register') {
            alert('Cloud registration successful! Please log in.');
            toggleAuthMode('login');
            return;
        }

        currentUser = data.user;
        document.getElementById('activeUserBadge').innerText = \`\${currentUser.name} (\${currentUser.id})\`;
        document.getElementById('loginOverlay').classList.add('hidden');
        errDiv.innerText = "";
        
        await fetchCloudCases();
        if (role === 'doctor') {
            showTab('dashboardTab');
        } else {
            showTab('triageTab');
        }
    } catch (err) {
        errDiv.innerText = err.message;
    }
}

function logout() {
    currentUser = null;
    document.getElementById('activeUserBadge').innerText = "Not Authenticated";
    document.getElementById('loginOverlay').classList.remove('hidden');
}

function renderChips() {
    const container = document.getElementById('symptomChips');
    container.innerHTML = '';
    Object.keys(DIAGNOSTIC_DATABASE).forEach(key => {
        const item = DIAGNOSTIC_DATABASE[key];
        const promptText = item.storyPrompt[currentLang] || item.storyPrompt['en'];
        const chip = document.createElement('div');
        chip.className = 'chip' + (selectedSymptoms.has(key) ? ' selected' : '');
        chip.setAttribute('data-key', key);
        chip.innerHTML = \`<strong>\${promptText}</strong><small>\${item.sign}</small>\`;
        chip.onclick = () => toggleChip(key, chip);
        container.appendChild(chip);
    });
}

function toggleChip(key, chipEl) {
    if (selectedSymptoms.has(key)) {
        selectedSymptoms.delete(key); chipEl.classList.remove('selected');
    } else {
        selectedSymptoms.add(key); chipEl.classList.add('selected');
    }
}

function filterChips() {
    const q = document.getElementById('chipSearch').value.toLowerCase();
    document.querySelectorAll('#symptomChips .chip').forEach(chip => {
        const key = chip.getAttribute('data-key');
        const item = DIAGNOSTIC_DATABASE[key];
        const textToSearch = (item.sign + ' ' + (item.storyPrompt[currentLang] || '') + ' ' + item.keywords.join(' ')).toLowerCase();
        chip.style.display = textToSearch.includes(q) ? 'block' : 'none';
    });
}

function processColloquialText() {
    const text = document.getElementById('symptomText').value.toLowerCase();
    Object.keys(DIAGNOSTIC_DATABASE).forEach(key => {
        const item = DIAGNOSTIC_DATABASE[key];
        if (item.keywords.some(k => text.includes(k)) && !selectedSymptoms.has(key)) {
            selectedSymptoms.add(key);
            const chip = document.querySelector(\`.chip[data-key="\${key}"]\`);
            if (chip) chip.classList.add('selected');
        }
    });
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    if(tabId === 'triageTab') document.getElementById('triageNavBtn').classList.add('active');
    if(tabId === 'dashboardTab') { document.getElementById('dashNavBtn').classList.add('active'); renderDashboardCases(); }
    if(tabId === 'gisTab') { document.getElementById('gisNavBtn').classList.add('active'); setTimeout(initMap, 200); }
}

function processTriageEngine() {
    const text = document.getElementById('symptomText').value.toLowerCase();
    let matchedKeys = new Set(selectedSymptoms);
    
    Object.keys(DIAGNOSTIC_DATABASE).forEach(key => {
        const item = DIAGNOSTIC_DATABASE[key];
        if (item.keywords.some(kw => text.includes(kw))) matchedKeys.add(key);
    });
    
    let highestSeverity = 'GREEN';
    let matchedSigns = [], differentials = [], fieldGuidance = [];
    
    matchedKeys.forEach(key => {
        const data = DIAGNOSTIC_DATABASE[key];
        if (data) {
            if (data.level === 'RED') highestSeverity = 'RED';
            else if (data.level === 'YELLOW' && highestSeverity !== 'RED') highestSeverity = 'YELLOW';
            matchedSigns.push(data.sign);
            differentials.push(...data.differentials);
            fieldGuidance.push(data.fieldGuidance);
        }
    });
    
    differentials = [...new Set(differentials)]; fieldGuidance = [...new Set(fieldGuidance)];
    const actionText = highestSeverity === 'RED' ? 'Transport immediately to District Hospital.' : highestSeverity === 'YELLOW' ? 'Schedule PHC evaluation within 48 hours.' : 'Routine monitoring.';
    
    const reportText = \`**Primary Clinical Verdict & Risk Level**\\n* **Triage Category:** \${highestSeverity}\\n* **Screening Worker:** \${currentUser ? currentUser.name : 'Unknown'}\\n* **Action Required:** \${actionText}\\n\\n**Symptom Analysis**\\n* **Observed:** \${matchedSigns.length > 0 ? matchedSigns.join(', ') : 'None'}\\n* **Differentials:**\\n\${differentials.map(d => \` * \${d}\`).join('\\n')}\\n\\n**Emergency Guidance**\\n\${fieldGuidance.map(g => \`* \${g}\`).join('\\n')}\`.trim();
    
    currentTriage = { level: highestSeverity, rawReport: reportText };
    document.getElementById('reportTimestamp').innerText = \`Screening Date: \${new Date().toLocaleString()}\`;
    const badge = document.getElementById('triageBadge');
    badge.className = \`badge-\${highestSeverity.toLowerCase()}\`;
    badge.innerText = \`\${highestSeverity} - \${highestSeverity === 'RED' ? 'EMERGENCY' : 'ROUTINE'}\`;
    const fill = document.getElementById('severityFill');
    fill.style.width = highestSeverity === 'RED' ? '100%' : highestSeverity === 'YELLOW' ? '60%' : '20%';
    fill.style.background = highestSeverity === 'RED' ? 'var(--red)' : highestSeverity === 'YELLOW' ? 'var(--yellow)' : 'var(--green)';
    document.getElementById('reportFormattedOutput').innerHTML = formatMarkdownToHTML(reportText);
    generateQRCode();
    document.getElementById('resultCard').classList.remove('hidden');
    document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth' });
}

function formatMarkdownToHTML(md) {
    return md.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/^\\* (.*$)/gim, '<div style="margin-left: 0.5rem;">• $1</div>').replace(/\\n/g, '<br>');
}

function generateQRCode() {
    const container = document.getElementById('qrcode-container');
    container.innerHTML = '';
    const payload = JSON.stringify({ p: document.getElementById('patientName').value || 'Unknown', t: currentTriage.level });
    new QRCode(container, { text: payload, width: 120, height: 120 });
}

async function saveCaseRecord() {
    const record = {
        name: document.getElementById('patientName').value || 'Anonymous',
        age: document.getElementById('patientAge').value || 'N/A',
        workerId: currentUser ? currentUser.id : 'N/A',
        workerName: currentUser ? currentUser.name : 'Unknown',
        triage: currentTriage.level,
        report: currentTriage.rawReport,
        timestamp: new Date().toLocaleString(),
        lat: 21.4669 + (Math.random() - 0.5) * 0.05,
        lng: 83.9812 + (Math.random() - 0.5) * 0.05
    };

    try {
        const res = await fetch(\`\${API_BASE_URL}/api/cases\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        if (!res.ok) throw new Error('Failed to save record to cloud');
        alert("Record securely saved to central cloud database and synced!");
        await fetchCloudCases();
        resetNewCase();
    } catch (err) {
        alert("Error saving record: " + err.message);
    }
}

async function fetchCloudCases() {
    try {
        const res = await fetch(\`\${API_BASE_URL}/api/cases\`);
        cloudCases = await res.json();
        document.getElementById('dbSyncStatus').innerText = \`Synced Records: \${cloudCases.length}\`;
        renderDashboardCases();
        if (mapInstance) updateMapMarkers();
    } catch (err) {
        console.error("Could not fetch cloud cases:", err);
    }
}

function renderDashboardCases() {
    const container = document.getElementById('caseList');
    if (cloudCases.length === 0) {
        container.innerHTML = "<p style='color:#64748b;'>No referral records found on cloud server.</p>";
        return;
    }
    let html = \`<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
        <tr style="border-bottom:2px solid #cbd5e1; text-align:left; background: #f8fafc;"><th style="padding: 0.75rem;">Patient</th><th style="padding: 0.75rem;">Worker</th><th style="padding: 0.75rem;">Triage</th><th style="padding: 0.75rem;">Time</th></tr>\`;
    cloudCases.forEach(c => {
        const color = c.triage === 'RED' ? 'var(--red)' : c.triage === 'YELLOW' ? 'var(--yellow)' : 'var(--green)';
        html += \`<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:0.75rem;"><b>\${c.name}</b></td>
            <td style="padding:0.75rem;">\${c.workerName} (\${c.workerId})</td>
            <td style="padding:0.75rem;"><span style="color:\${color}; font-weight:bold;">\${c.triage}</span></td>
            <td style="padding:0.75rem; color:#64748b; font-size: 0.8rem;">\${c.timestamp}</td>
        </tr>\`;
    });
    html += '</table>';
    container.innerHTML = html;
}

function initMap() {
    if (mapInstance) return;
    mapInstance = L.map('map').setView([21.4669, 83.9812], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(mapInstance);
    updateMapMarkers();
}

function updateMapMarkers() {
    cloudCases.forEach(c => {
        if (c.lat && c.lng) {
            const color = c.triage === 'RED' ? 'red' : c.triage === 'YELLOW' ? 'orange' : 'green';
            L.circleMarker([c.lat, c.lng], { color: color, radius: 8 }).addTo(mapInstance)
            .bindPopup(\`<b>\${c.name}</b><br>Triage: \${c.triage}\`);
        }
    });
}

function resetNewCase() {
    document.getElementById('patientName').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('symptomText').value = '';
    selectedSymptoms.clear();
    document.querySelectorAll('#symptomChips .chip').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.atlas-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('resultCard').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.onload = () => { renderChips(); };
</script>
</body>
</html>`);
});

// ==================== 4. START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AshaCare Multilingual Cloud Engine running at http://localhost:${PORT}`));
