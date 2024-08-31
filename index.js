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

// Getting home page
app.get("/", (req, res) => {
  res.render("index.ejs");
});

// Admin login page:
app.get("/adminlogin", (req, res) => {
  res.render("adminlogin.ejs");
});

app.post("/adminlogin",async (req, res) => {
  const userName = req.body.username;
  const password = req.body.password;
  const username = await db.query("SELECT * FROM adminlogin WHERE id=$1 AND password=$2",[userName,password]);
  const data = username.rows;
  if (data.length > 0){
    res.render("adminform.ejs",{
      communityName: userName,
      adminId:data[0].id
    });
  }else{
    res.send("try again");
  }
});

app.post("/subeventform", async(req, res) =>{
 const subEventName = req.body.subeventname;
 const subEventDetails = req.body.subeventdetails;
 const subEventDate = req.body.subeventdate;
 const adminId = req.body.adminId;
 await db.query('INSERT INTO subevent (subevent_name,subevent_details,subevent_date,user_id,event_id) VALUES ($1, $2, $3, $4, 1)',[subEventName, subEventDetails, subEventDate,adminId ]);
 res.send("Sub event added successfully");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
