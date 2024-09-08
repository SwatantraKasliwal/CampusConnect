import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

// Middleware and constants
const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
  },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  try{
    res.render("index.ejs");
  }catch(err){
    console.log(err);
    res.status(500).send("Error rendering home page");
  }
});

app.get("/index", (req, res)=>{
  res.render("index.ejs");
});

app.get('/events',async (req, res)=>{
  try{
    const data = await db.query("SELECT e.*,a.admin_id from event e join adminlogin a ON a.id = e.user_id;");
    const result = data.rows
    res.render("event.ejs",{events:result})
  }catch(err){
    // console.log(err);
    res.status(500).send("Error Loading events, Please try again");
  }
});

// Getting Admin login page:
app.get("/adminlogin", (req, res) => {
  try{
    if(req.isAuthenticated()){
      res.redirect("/adminevent");
    }else{
      res.render("adminlogin.ejs");
    }
  }catch(err){
    console.log(err);
    res.send("Login Fail try again later");
  }
});

app.get("/adminform", async (req, res)=>{
  if (req.isAuthenticated()) {
    console.log(req.user.admin_id); // Getting the admin id from this
    res.render("adminform.ejs",{adminId:req.user.admin_id});
  }else{
    res.render("adminlogin.ejs");
  }
});

app.get("/logout", (req, res)=>{
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/adminlogin");
    });
  });

app.get("/adminevent", async (req, res)=>{
  if (req.isAuthenticated()) {
    console.log(req.user.id); // Getting the admin id from this
    try{
      const data = await db.query("SELECT e.*,a.admin_id from event e join adminlogin a ON a.id = e.user_id WHERE e.user_id = $1;",[req.user.id]);
      const result = data.rows
      console.log(result);
      res.render("adminevent.ejs",{adminEvents:result})
    }catch(err){
      // console.log(err);
      res.status(500).send("Error Loading events, Please try again");
    }
  }else{
    res.render("adminlogin.ejs");
  }
});

app.post("/adminlogin", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    console.log(user.admin_id);
    if (err) { return next(err); }
    if (!user) { return res.redirect("/adminlogin"); }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      console.log(req.user); // Log the authenticated user
      return res.redirect("/adminevent");
    });
  })(req, res, next);
});

app.post("/adminform", async(req, res)=>{
  if (req.isAuthenticated()) {
    console.log(req.user.admin_id); // Getting the admin id from this
    const {eventname, eventdetails, eventdate, eventtime, eventvenue} = req.body;
    const adminId = req.user.id;
    try{
      await db.query("INSERT INTO event (event_name, event_details, event_date,user_id, eventvenue, eventtime) VALUES ($1, $2, $3, $4,$5, $6)", [eventname, eventdetails, eventdate, adminId,eventvenue, eventtime]);
       res.render("partials/successful.ejs");
     }catch(err){
       console.log(err);
       res.status(500).send("Error adding event");
     }
  }else{
    res.render("adminlogin.ejs");
  }
});

app.post("/delete", async (req, res) =>{
  const deleteEvent = req.body.deleteEventId;
  console.log(deleteEvent);
  
  try{
    await db.query("DELETE FROM event WHERE event_id = $1",[deleteEvent]);
    res.redirect("/adminevent");
  }catch(err){
    console.log(err);
  }
});

// creating the strategies 
passport.use("local", new Strategy(async function verify(username, password, cb){
  console.log(username, password);
  try{
    const result = await db.query("SELECT * FROM adminlogin WHERE admin_id=$1",[username]);
    if(result.rows.length>0){
      const admin = result.rows[0];
      const storedPassword = admin.password;
      if (password === storedPassword){
        return cb(null,admin);
      }
    }else{
      return cb("Please Check the username or password");
    }
  }catch(err){
   return cb(err)
  }
}));

passport.serializeUser((admin, cb) => {
  cb(null, admin.admin_id);
});

passport.deserializeUser((id, cb) => {
  db.query("SELECT * FROM adminlogin WHERE admin_id=$1", [id], (err, result) => {
    if (err) { return cb(err); }
    cb(null, result.rows[0]);
  });
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
