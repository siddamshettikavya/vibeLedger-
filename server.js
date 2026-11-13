const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "data", "db.json");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const initialDB = {
  users: [
    { id: 1, name: "Aarav Mehta", email: "aarav@example.com", passwordHash: bcrypt.hashSync("demo123", 10), bio: "Motion designer who loves making ideas move.", location: "Hyderabad, India", teach: ["Motion Design", "After Effects", "Storyboarding"], learn: ["3D Animation", "Blender"], avatar: "AM", connections: [2,3], createdAt: new Date().toISOString() },
    { id: 2, name: "Mira Rao", email: "mira@example.com", passwordHash: bcrypt.hashSync("demo123", 10), bio: "Frontend developer building playful digital experiences.", location: "Warangal, India", teach: ["HTML/CSS", "JavaScript", "React"], learn: ["UI/UX", "Figma"], avatar: "MR", connections: [1], createdAt: new Date().toISOString() },
    { id: 3, name: "Zoya Khan", email: "zoya@example.com", passwordHash: bcrypt.hashSync("demo123", 10), bio: "Digital artist exploring 3D worlds and visual storytelling.", location: "Bengaluru, India", teach: ["Digital Illustration", "Blender", "3D Modeling"], learn: ["Python Automation", "Web Design"], avatar: "ZK", connections: [1], createdAt: new Date().toISOString() },
    { id: 4, name: "Riya Sen", email: "riya@example.com", passwordHash: bcrypt.hashSync("demo123", 10), bio: "UX designer who turns research insights into friendly, accessible interfaces.", location: "Pune, India", teach: ["UI/UX Design", "Figma", "User Research"], learn: ["Frontend Development", "Motion Design"], avatar: "RS", connections: [], createdAt: new Date().toISOString() },
    { id: 5, name: "Dev Patel", email: "dev@example.com", passwordHash: bcrypt.hashSync("demo123", 10), bio: "Curious data enthusiast making useful tools with Python and simple dashboards.", location: "Ahmedabad, India", teach: ["Python", "Data Visualization", "SQL"], learn: ["Product Design", "Public Speaking"], avatar: "DP", connections: [], createdAt: new Date().toISOString() },
    { id: 6, name: "Ananya Iyer", email: "ananya@example.com", passwordHash: bcrypt.hashSync("demo123", 10), bio: "Content strategist helping early ideas find a clear and memorable voice.", location: "Chennai, India", teach: ["Content Writing", "Storytelling", "Social Media"], learn: ["Video Editing", "Brand Design"], avatar: "AI", connections: [], createdAt: new Date().toISOString() },
    { id: 7, name: "Kabir Shah", email: "kabir@example.com", passwordHash: bcrypt.hashSync("demo123", 10), bio: "Photographer and maker sharing practical tips for visual storytelling.", location: "Mumbai, India", teach: ["Photography", "Lightroom", "Visual Storytelling"], learn: ["Web Design", "JavaScript"], avatar: "KS", connections: [], createdAt: new Date().toISOString() }
  ],
  exchanges: [
    { id: 1, fromId: 1, toId: 2, teachSkill: "Motion Design", learnSkill: "React", note: "A two-session skill swap to build a tiny animated portfolio.", status: "pending", createdAt: new Date().toISOString() }
  ],
  posts: [
    { id: 1, userId: 2, text: "Just shipped a tiny interactive portfolio experiment. Looking for someone to swap React tips for Figma feedback ✨", tags: ["React", "Figma"], likes: [1], createdAt: new Date().toISOString() },
    { id: 2, userId: 3, text: "My first Blender scene is finally done. Happy to share the workflow with anyone learning 3D!", tags: ["Blender", "3D"], likes: [], createdAt: new Date().toISOString() }
  ],
  proofs: [
    { id: 1, userId: 1, title: "Animated product teaser", description: "Created a 12-second motion design teaser for a fictional launch.", skills: ["Motion Design", "Storyboarding"], link: "https://example.com", attestations: [2], createdAt: new Date().toISOString() },
    { id: 2, userId: 2, title: "Accessible portfolio UI", description: "Built a responsive portfolio concept with keyboard-friendly navigation.", skills: ["HTML/CSS", "Accessibility"], link: "", attestations: [1,3], createdAt: new Date().toISOString() }
  ],
  reviews: [
    { id: 1, fromId: 2, toId: 1, exchangeId: 1, rating: 5, text: "Clear, reliable, and great at explaining the creative process.", createdAt: new Date().toISOString() }
  ],
  notifications: [],
  points: []
};
function writeDB(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); if (io) io.emit("data-updated", { at: new Date().toISOString() }); }
function addNotification(db, userId, actorId, type, message, page) {
  db.notifications.unshift({ id: Math.max(0, ...db.notifications.map(item => item.id)) + 1, userId, actorId, type, message, page, createdAt: new Date().toISOString(), readAt: null });
}
function awardDailyPoints(db, userId, activity, points) {
  const today = new Date().toISOString().slice(0, 10);
  if (db.points.some(entry => entry.userId === userId && entry.date === today && entry.activity === activity)) return 0;
  db.points.push({ id: Math.max(0, ...db.points.map(entry => entry.id)) + 1, userId, activity, points, date: today, createdAt: new Date().toISOString() });
  return points;
}

// Seed the database on first launch. If a prior/empty database exists, restore
// missing demo accounts so the published demo login credentials continue to work.
if (!fs.existsSync(DB_PATH)) {
  writeDB(initialDB);
} else {
  try {
    const existing = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    let changed = false;
    for (const key of ["users", "exchanges", "posts", "proofs", "reviews", "notifications", "points"]) {
      if (!Array.isArray(existing[key])) { existing[key] = []; changed = true; }
    }
    let nextUserId = Math.max(0, ...existing.users.map(u => Number(u.id) || 0)) + 1;
    for (const seededUser of initialDB.users) {
      if (!existing.users.some(u => String(u.email).toLowerCase() === seededUser.email.toLowerCase())) {
        const user = { ...seededUser };
        if (existing.users.some(u => u.id === user.id)) user.id = nextUserId++;
        existing.users.push(user);
        changed = true;
      }
    }
    for (const key of ["exchanges", "posts", "proofs", "reviews"]) {
      if (existing[key].length === 0 && initialDB[key].length) {
        existing[key] = initialDB[key];
        changed = true;
      }
    }
    if (changed) writeDB(existing);
  } catch (err) {
    const backupPath = DB_PATH + ".broken-" + Date.now();
    fs.copyFileSync(DB_PATH, backupPath);
    writeDB(initialDB);
    console.warn("Previous data file was invalid; backup saved at", backupPath);
  }
}
function readDB() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  for (const key of ["users", "exchanges", "posts", "proofs", "reviews", "notifications", "points"]) {
    if (!Array.isArray(db[key])) db[key] = [];
  }
  return db;
}
function publicUser(u, db) {
  const completed = db.exchanges.filter(e => (e.fromId === u.id || e.toId === u.id) && e.status === "completed").length;
  const reviews = db.reviews.filter(r => r.toId === u.id);
  const reputation = reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1) : "New";
  return { id:u.id, name:u.name, email:u.email, bio:u.bio, location:u.location, teach:u.teach, learn:u.learn, avatar:u.avatar, connections:u.connections || [], completedSwaps:completed, reputation, reviewCount:reviews.length, resume: u.resume ? { originalName: u.resume.originalName, uploadedAt: u.resume.uploadedAt } : null };
}
function safePost(p, db) { const u=db.users.find(x=>x.id===p.userId); return {...p, author:u?publicUser(u,db):null}; }
function auth(req,res,next) { if (!req.session.userId) return res.status(401).json({error:"Please sign in to continue."}); next(); }
app.use(express.json({limit:"1mb"}));
app.use(session({ secret: process.env.SESSION_SECRET || "change-this-vibeledger-session-secret", resave:false, saveUninitialized:false, cookie:{ httpOnly:true, sameSite:"lax", maxAge: 7*24*60*60*1000 } }));
app.use(express.static(path.join(__dirname, "public")));

const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume-${req.session.userId}-${Date.now()}${ext}`);
  }
});
const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".pdf", ".doc", ".docx"].includes(ext)) return cb(null, true);
    cb(new Error("Upload a PDF, DOC, or DOCX resume (maximum 5 MB)."));
  }
});
app.post("/api/resume", auth, (req, res) => {
  resumeUpload.single("resume")(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || "Resume upload failed." });
    if (!req.file) return res.status(400).json({ error: "Choose a resume file first." });
    const db = readDB();
    const user = db.users.find(u => u.id === req.session.userId);
    if (user.resume?.filename) {
      const previous = path.join(UPLOAD_DIR, path.basename(user.resume.filename));
      if (fs.existsSync(previous)) fs.unlinkSync(previous);
    }
    user.resume = { filename: req.file.filename, originalName: path.basename(req.file.originalname), uploadedAt: new Date().toISOString() };
    writeDB(db);
    res.json({ resume: { originalName: user.resume.originalName, uploadedAt: user.resume.uploadedAt } });
  });
});
app.get("/api/resume/:userId", auth, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === Number(req.params.userId));
  if (!user || !user.resume?.filename) return res.status(404).json({ error: "No resume uploaded." });
  const filePath = path.join(UPLOAD_DIR, path.basename(user.resume.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Resume file is missing. Please upload it again." });
  res.download(filePath, user.resume.originalName || "resume");
});

app.get("/api/health", (req,res)=>res.json({ok:true, name:"VibeLedger API"}));
app.get("/api/me", (req,res)=>{ if(!req.session.userId) return res.json({user:null}); const db=readDB(), u=db.users.find(x=>x.id===req.session.userId); res.json({user:u?publicUser(u,db):null}); });

app.post("/api/register", async (req,res)=>{
  const {name,email,password}=req.body||{};
  if(!name?.trim() || !email?.trim() || !password || password.length<6) return res.status(400).json({error:"Enter your name, a valid email, and a password with at least 6 characters."});
  const db=readDB(), normalized=email.trim().toLowerCase();
  if(db.users.some(u=>u.email.toLowerCase()===normalized)) return res.status(409).json({error:"An account with this email already exists."});
  const id=Math.max(0,...db.users.map(u=>u.id))+1;
  const user={id,name:name.trim(),email:normalized,passwordHash:await bcrypt.hash(password,10),bio:"New to VibeLedger — ready to exchange skills.",location:"India",teach:[],learn:[],avatar:name.trim().split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase(),connections:[],createdAt:new Date().toISOString()};
  db.users.push(user); writeDB(db); req.session.userId=id; res.status(201).json({user:publicUser(user,db)});
});
app.post("/api/login", async (req,res)=>{
  const {email,password}=req.body||{}; const db=readDB(), user=db.users.find(u=>u.email.toLowerCase()===(email||"").trim().toLowerCase());
  if(!user || !await bcrypt.compare(password||"",user.passwordHash)) return res.status(401).json({error:"Email or password is incorrect."});
  req.session.userId=user.id; res.json({user:publicUser(user,db)});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/users", auth, (req,res)=>{
  const db=readDB(), q=(req.query.q||"").toLowerCase(), skill=(req.query.skill||"").toLowerCase();
  const users=db.users.filter(u=>u.id!==req.session.userId).filter(u=>{
    const all=[u.name,u.bio,u.location,...u.teach,...u.learn].join(" ").toLowerCase();
    return (!q||all.includes(q)) && (!skill||[...u.teach,...u.learn].some(s=>s.toLowerCase().includes(skill)));
  }).map(u=>publicUser(u,db));
  res.json({users});
});
app.put("/api/profile", auth, (req,res)=>{
  const db=readDB(), u=db.users.find(x=>x.id===req.session.userId);
  const {name,bio,location,teach,learn}=req.body||{};
  if(typeof name==="string"&&name.trim()) u.name=name.trim();
  if(typeof bio==="string") u.bio=bio.slice(0,400);
  if(typeof location==="string") u.location=location.slice(0,100);
  if(Array.isArray(teach)) u.teach=[...new Set(teach.map(s=>String(s).trim()).filter(Boolean))].slice(0,20);
  if(Array.isArray(learn)) u.learn=[...new Set(learn.map(s=>String(s).trim()).filter(Boolean))].slice(0,20);
  u.avatar=u.name.split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase(); writeDB(db); res.json({user:publicUser(u,db)});
});
app.post("/api/connections/:id", auth, (req,res)=>{
  const db=readDB(), me=db.users.find(u=>u.id===req.session.userId), other=db.users.find(u=>u.id===Number(req.params.id));
  if(!other||other.id===me.id) return res.status(404).json({error:"Student not found."});
  me.connections=me.connections||[]; other.connections=other.connections||[];
  if(me.connections.includes(other.id)){me.connections=me.connections.filter(id=>id!==other.id);other.connections=other.connections.filter(id=>id!==me.id);}
  else {me.connections.push(other.id);other.connections.push(me.id);addNotification(db,other.id,me.id,"connection",`${me.name} connected with you.`,`connections`);awardDailyPoints(db,me.id,"connection",5);}
  writeDB(db); res.json({connected:me.connections.includes(other.id), user:publicUser(me,db)});
});
app.get("/api/notifications",auth,(req,res)=>{const db=readDB(),items=db.notifications.filter(n=>n.userId===req.session.userId);res.json({notifications:items.slice(0,30).map(n=>({...n,actor:publicUser(db.users.find(u=>u.id===n.actorId),db)})),unreadCount:items.filter(n=>!n.readAt).length});});
app.post("/api/notifications/read",auth,(req,res)=>{const db=readDB(),now=new Date().toISOString();for(const notification of db.notifications){if(notification.userId===req.session.userId&&!notification.readAt)notification.readAt=now;}writeDB(db);res.json({ok:true});});
app.post("/api/points/quiz",auth,(req,res)=>{const db=readDB(),awarded=awardDailyPoints(db,req.session.userId,"quiz",5);writeDB(db);res.json({awarded,pointsToday:db.points.filter(p=>p.userId===req.session.userId&&p.date===new Date().toISOString().slice(0,10)).reduce((sum,p)=>sum+p.points,0)});});

app.get("/api/exchanges", auth, (req,res)=>{
  const db=readDB(), exchanges=db.exchanges.filter(e=>e.fromId===req.session.userId||e.toId===req.session.userId).map(e=>({...e,from:publicUser(db.users.find(u=>u.id===e.fromId),db),to:publicUser(db.users.find(u=>u.id===e.toId),db)}));
  res.json({exchanges});
});
app.post("/api/exchanges", auth, (req,res)=>{
  const {toId,teachSkill,learnSkill,note}=req.body||{}, db=readDB();
  if(!db.users.some(u=>u.id===Number(toId))||Number(toId)===req.session.userId) return res.status(400).json({error:"Choose another student."});
  if(!teachSkill?.trim()||!learnSkill?.trim()) return res.status(400).json({error:"Both swap skills are required."});
  const exchange={id:Math.max(0,...db.exchanges.map(e=>e.id))+1,fromId:req.session.userId,toId:Number(toId),teachSkill:teachSkill.trim(),learnSkill:learnSkill.trim(),note:(note||"").slice(0,500),status:"pending",createdAt:new Date().toISOString()};
  db.exchanges.unshift(exchange);addNotification(db,exchange.toId,exchange.fromId,"exchange",`${db.users.find(u=>u.id===exchange.fromId).name} sent you a skill-swap request.`,"exchanges");writeDB(db); res.status(201).json({exchange});
});
app.patch("/api/exchanges/:id", auth, (req,res)=>{
  const db=readDB(), e=db.exchanges.find(x=>x.id===Number(req.params.id));
  if(!e) return res.status(404).json({error:"Exchange not found."});
  if(e.fromId!==req.session.userId&&e.toId!==req.session.userId) return res.status(403).json({error:"This exchange does not belong to you."});
  const status=req.body?.status, allowed=["accepted","declined","completed"];
  if(!allowed.includes(status)) return res.status(400).json({error:"Invalid exchange status."});
  if(status==="accepted"||status==="declined"){if(e.toId!==req.session.userId) return res.status(403).json({error:"Only the recipient can accept or decline."}); if(e.status!=="pending") return res.status(400).json({error:"This request is no longer pending."});}
  if(status==="completed"&&e.status!=="accepted") return res.status(400).json({error:"Accept the exchange before marking it complete."});
  const previousStatus=e.status;e.status=status;
  if(status==="accepted"||status==="declined")addNotification(db,e.fromId,req.session.userId,"exchange",`${db.users.find(u=>u.id===req.session.userId).name} ${status} your skill-swap request.`,"exchanges");
  if(status==="completed"&&previousStatus!=="completed"){awardDailyPoints(db,e.fromId,"completed-swap",15);awardDailyPoints(db,e.toId,"completed-swap",15);}
  writeDB(db); res.json({exchange:e});
});
app.post("/api/posts", auth, (req,res)=>{
  const {text:body,tags}=req.body||{}; if(!body?.trim()) return res.status(400).json({error:"Write something before posting."});
  const db=readDB(), post={id:Math.max(0,...db.posts.map(p=>p.id))+1,userId:req.session.userId,text:body.trim().slice(0,1000),tags:Array.isArray(tags)?tags.map(String).slice(0,8):[],likes:[],createdAt:new Date().toISOString()};
  awardDailyPoints(db,req.session.userId,"community-post",3);
  db.posts.unshift(post); writeDB(db); res.status(201).json({post:safePost(post,db)});
});
app.get("/api/posts", auth, (req,res)=>{const db=readDB();res.json({posts:db.posts.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(p=>safePost(p,db))});});
app.post("/api/posts/:id/like", auth, (req,res)=>{
  const db=readDB(), p=db.posts.find(x=>x.id===Number(req.params.id)); if(!p)return res.status(404).json({error:"Post not found."});
  p.likes=p.likes||[]; p.likes=p.likes.includes(req.session.userId)?p.likes.filter(id=>id!==req.session.userId):[...p.likes,req.session.userId]; writeDB(db); res.json({likes:p.likes.length,liked:p.likes.includes(req.session.userId)});
});
app.get("/api/proofs", auth, (req,res)=>{const db=readDB();res.json({proofs:db.proofs.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(p=>({...p,user:publicUser(db.users.find(u=>u.id===p.userId),db),attestationCount:p.attestations.length,attested:p.attestations.includes(req.session.userId)}))});});
app.post("/api/proofs", auth, (req,res)=>{
  const {title,description,idea,code,skills,link}=req.body||{}; if(!title?.trim()||!description?.trim())return res.status(400).json({error:"Add a title and description for your proof."});
  if(typeof code==="string"&&code.length>12000)return res.status(400).json({error:"Starter code must be 12,000 characters or fewer."});
  const db=readDB(), p={id:Math.max(0,...db.proofs.map(x=>x.id))+1,userId:req.session.userId,title:title.trim().slice(0,100),description:description.trim().slice(0,600),idea:typeof idea==="string"?idea.trim().slice(0,600):"",code:typeof code==="string"?code.slice(0,12000):"",skills:Array.isArray(skills)?skills.map(String).slice(0,10):[],link:(link||"").trim().slice(0,300),attestations:[],createdAt:new Date().toISOString()};
  awardDailyPoints(db,req.session.userId,"project-proof",10);
  db.proofs.unshift(p);writeDB(db);res.status(201).json({proof:p});
});
app.post("/api/proofs/:id/attest", auth, (req,res)=>{
  const db=readDB(), p=db.proofs.find(x=>x.id===Number(req.params.id)); if(!p)return res.status(404).json({error:"Proof not found."});
  if(p.userId===req.session.userId)return res.status(400).json({error:"You cannot attest your own proof."});
  p.attestations=p.attestations||[];const wasAttested=p.attestations.includes(req.session.userId);p.attestations=wasAttested?p.attestations.filter(id=>id!==req.session.userId):[...p.attestations,req.session.userId];if(!wasAttested)addNotification(db,p.userId,req.session.userId,"proof",`${db.users.find(u=>u.id===req.session.userId).name} vouched for your project, ${p.title}.`,"proofs");writeDB(db);res.json({attested:p.attestations.includes(req.session.userId),count:p.attestations.length});
});
app.post("/api/reviews", auth, (req,res)=>{
  const {toId,exchangeId,rating,text}=req.body||{}, db=readDB(), e=db.exchanges.find(x=>x.id===Number(exchangeId));
  if(!e||e.status!=="completed"||![e.fromId,e.toId].includes(req.session.userId)||![e.fromId,e.toId].includes(Number(toId))||Number(toId)===req.session.userId)return res.status(400).json({error:"Reviews are available only for the other participant in a completed swap."});
  if(db.reviews.some(r=>r.exchangeId===e.id&&r.fromId===req.session.userId))return res.status(409).json({error:"You have already reviewed this swap."});
  const n=Number(rating);if(!Number.isInteger(n)||n<1||n>5)return res.status(400).json({error:"Rating must be between 1 and 5."});
  const review={id:Math.max(0,...db.reviews.map(r=>r.id))+1,fromId:req.session.userId,toId:Number(toId),exchangeId:e.id,rating:n,text:(text||"").slice(0,500),createdAt:new Date().toISOString()};db.reviews.push(review);writeDB(db);res.status(201).json({review});
});
app.get("/api/stats",auth,(req,res)=>{const db=readDB(),userPoints=db.points.filter(p=>p.userId===req.session.userId),today=new Date().toISOString().slice(0,10);res.json({members:db.users.length,swaps:db.exchanges.filter(e=>e.status==="completed").length,proofs:db.proofs.length,connections:(db.users.find(u=>u.id===req.session.userId)?.connections||[]).length,pointsToday:userPoints.filter(p=>p.date===today).reduce((sum,p)=>sum+p.points,0),totalPoints:userPoints.reduce((sum,p)=>sum+p.points,0)});});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
io.on("connection", socket => {
  socket.emit("connected", { ok: true });
});
server.listen(PORT,()=>console.log(`VibeLedger running at http://localhost:${PORT}`));
