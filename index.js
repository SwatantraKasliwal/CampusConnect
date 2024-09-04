import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "campusConnect",
  password: "Swatantra@25",
  port: 5433,
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

// ---------------------- ADMIN SECTION -----------------------------
// Getting Admin login page:
app.get("/adminlogin", (req, res) => {
  try{
    res.render("adminlogin.ejs");
  }catch(err){
    console.log(err);
    res.status(500).send("Error rendering admin login page");
  }
});

// Checking the admin credentials and directing it to events form
app.post("/adminlogin",async (req, res) => {
  try{
    const {username, password} = req.body;
    const admin = await db.query("SELECT * FROM adminlogin WHERE admin_id=$1 AND password=$2",[username,password]);
    const data = admin.rows;
    // console.log("admin id is " + data[0].id);
    if (data.length > 0){
      res.render("adminform.ejs",{
        communityName: username,
        adminId: data,
      });
    }else{
      res.send("Please Check the username or password");
    }
  }catch(err){
    console.log(err);
    res.status(500).send("Error Logging in");
  }
  
});

// adding the data of event into the database
app.post("/adminform", async(req, res)=>{
  const {eventname, eventdetails, eventdate, eventtime, eventvenue} = req.body;
  const adminId = req.body.adminId;
  try{
   await db.query("INSERT INTO event (event_name, event_details, event_date,user_id, eventvenue, eventtime) VALUES ($1, $2, $3, $4,$5, $6)", [eventname, eventdetails, eventdate, adminId,eventvenue, eventtime]);
    res.render("partials/successful.ejs");
  }catch(err){
    console.log(err);
    res.status(500).send("Error adding event");
  }
});

// ------------- EVENT SECTION -----------------
app.get('/events',async (req, res)=>{
  try{
    // const data = await db.query("SELECT * FROM event");
    // const result = data.rows;
    const data = await db.query("SELECT e.*,a.admin_id from event e join adminlogin a ON a.id = e.user_id;");
    const result = data.rows
    res.render("event.ejs",{events:result})
  }catch(err){
    console.log(err);
    res.status(500).send("Error Loading events, Please try again");
  }
});
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
