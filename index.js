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
  if (username.rows.length > 0){
    res.send("you succesfully login");
  }else{
    res.send("try again");
  }

});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
