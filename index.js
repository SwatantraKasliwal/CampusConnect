import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import fileUpload from "express-fileupload";
import nodemailer from "nodemailer";

// Middleware and constants
const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
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
app.use(fileUpload());

// ---------- Email Service ----------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  logger: true, // Enable logging
  debug: true, // Include SMTP traffic in the logs
});

// Send email to all users
async function sendEmailsToUsers(eventDetails) {
  try {
    // Fetch all students' emails
    const result = await db.query("SELECT s_email FROM studentlogin");
    const emails = result.rows.map((row) => row.s_email);

    // Create the email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emails.join(","), // Sending to all students
      subject: `New Event Added: ${eventDetails.eventname}`,
      text: `Hi there, a new event "${eventDetails.eventname}" has been added.\nDetails: ${eventDetails.eventdetails}\nDate: ${eventDetails.eventdate}\nTime: ${eventDetails.eventtime}\nVenue: ${eventDetails.eventvenue}\nURL: ${eventDetails.eventurl}`,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log("Emails sent successfully");
  } catch (error) {
    console.log("Error sending emails:", error);
  }
}

// ---------- Get Routes ----------
app.get("/", (req, res) => {
  try {
    res.render("index.ejs");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error rendering home page");
  }
});

app.get("/index", (req, res) => {
  res.render("index.ejs");
});

app.get("/adminHome", (req, res) => {
  res.render("adminHome.ejs");
});

app.get("/studentHome", (req, res) => {
  res.render("studentHome.ejs");
});

// Events section
app.get("/events", async (req, res) => {
  try {
    // const data = await db.query("SELECT e.*,a.admin_id from event e join adminlogin a ON a.id = e.user_id;");
    const data = await db.query(
      "SELECT e.*, a.admin_id FROM event e JOIN adminlogin a ON a.id = e.user_id ORDER BY e.event_id DESC;"
    );
    const result = data.rows;
    res.render("event.ejs", { events: result });
  } catch (err) {
    // console.log(err);
    res.status(500).send("Error Loading events, Please try again");
  }
});

app.get("/adminevent", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log(req.user.id); // Getting the admin id from this
    try {
      const data = await db.query(
        "SELECT e.*,a.admin_id from event e join adminlogin a ON a.id = e.user_id WHERE e.user_id = $1 ORDER BY e.event_id DESC;",
        [req.user.id]
      );
      const result = data.rows;
      console.log(result);
      res.render("adminevent.ejs", { adminEvents: result });
    } catch (err) {
      // console.log(err);
      res.status(500).send("Error Loading events, Please try again");
    }
  } else {
    res.render("adminlogin.ejs");
  }
});

app.get("/studentevent", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log(req.user.id); // Getting the student id from this
    try {
      const data = await db.query(
        "SELECT e.*,a.admin_id from event e join adminlogin a ON a.id = e.user_id ORDER BY e.event_id DESC"
      );
      const result = data.rows;
      console.log(result);
      res.render("studentevent.ejs", { studentEvents: result });
    } catch (err) {
      // console.log(err);
      res.status(500).send("Error Loading events, Please try again");
    }
  } else {
    res.render("adminlogin.ejs");
  }
});

app.get("/adminlogin", (req, res) => {
  try {
    if (req.isAuthenticated()) {
      res.redirect("/adminevent");
    } else {
      res.render("adminlogin.ejs");
    }
  } catch (err) {
    console.log(err);
    res.send("Login Fail try again later");
  }
});

app.get("/adminform", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log(req.user.admin_id); // Getting the admin id from this
    res.render("adminform.ejs", { adminId: req.user.admin_id });
  } else {
    res.render("adminlogin.ejs");
  }
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/index");
  });
});

//  Getting the image data
app.get("/images/:imageName", async (req, res) => {
  try {
    const imageName = req.params.imageName;
    const data = await db.query(
      "SELECT banner_data FROM event WHERE event_banner = $1",
      [imageName]
    );
    if (data.rows.length > 0) {
      const img = data.rows[0].banner_data;
      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Content-Length": img.length,
      });
      res.end(img);
    } else {
      res.status(404).send("Image not found");
    }
  } catch (err) {
    res.status(500).send("Error retrieving image");
  }
});

app.get("/studentlogin", (req, res) => {
  try {
    if (req.isAuthenticated()) {
      res.redirect("/studentevent");
    } else {
      res.render("studentlogin.ejs");
    }
  } catch (err) {
    console.log(err);
    res.send("Login Fail try again later");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/studentevent",
    failureRedirect: "/studentlogin",
  })
);

// ---------- Post Routes ----------
app.post("/adminlogin", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    console.log(user.admin_id);
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/adminlogin");
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      console.log(req.user); // Log the authenticated user
      return res.redirect("/adminevent");
    });
  })(req, res, next);
});

app.post("/studentlogin", (req, res, next) => {
  passport.authenticate("student-local", (err, user, info) => {
    console.log(user.s_email);
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect("/studentlogin");
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      console.log(req.user); //Login the authenticated student
      return res.redirect("/studentevent");
    });
  })(req, res, next);
});

app.post("/registerstudent", async (req, res) => {
  const s_email = req.body.username;
  const s_password = req.body.password;

  try {
    const checkResult = await db.query(
      "SELECT * FROM studentlogin WHERE s_email = $1",
      [s_email]
    );

    if (checkResult.rows.length > 0) {
      res.redirect("/studentlogin");
    } else {
      bcrypt.hash(s_password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO studentlogin (s_email, s_password) VALUES ($1, $2) RETURNING *",
            [s_email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/studentevent");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/adminform", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log(req.user.admin_id); // Getting the admin id from this
    const {
      eventname,
      eventdetails,
      eventdate,
      eventtime,
      eventvenue,
      eventurl,
    } = req.body;
    const adminId = req.user.id;
    const eventBanner = req.files.eventbanner;
    try {
      await db.query(
        "INSERT INTO event (event_name, event_details, event_date,user_id, event_venue, event_time, event_url, event_banner, banner_data) VALUES ($1, $2, $3, $4,$5, $6, $7, $8, $9)",
        [
          eventname,
          eventdetails,
          eventdate,
          adminId,
          eventvenue,
          eventtime,
          eventurl,
          eventBanner.name,
          eventBanner.data,
        ]
      );

      // Sending email to users
      await sendEmailsToUsers({
        eventname,
        eventdetails,
        eventdate,
        eventtime,
        eventvenue,
        eventurl,
      });
      res.render("partials/successful.ejs");
    } catch (err) {
      console.log(err);
      res.status(500).send("Error adding event");
    }
  } else {
    res.render("adminlogin.ejs");
  }
});

app.post("/delete", async (req, res) => {
  const deleteEvent = req.body.deleteEventId;
  console.log(deleteEvent);

  try {
    await db.query("DELETE FROM event WHERE event_id = $1", [deleteEvent]);
    res.redirect("/adminevent");
  } catch (err) {
    console.log(err);
  }
});

// creating the strategies
passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    console.log(username, password);
    try {
      const result = await db.query(
        "SELECT * FROM adminlogin WHERE admin_id=$1",
        [username]
      );
      if (result.rows.length > 0) {
        const admin = result.rows[0];
        const storedPassword = admin.password;
        if (password === storedPassword) {
          return cb(null, admin);
        }
      } else {
        return cb("Please Check the username or password");
      }
    } catch (err) {
      return cb(err);
    }
  })
);

passport.use(
  "student-local",
  new Strategy(async function verify(username, password, cb) {
    console.log(username, password);
    try {
      const result = await db.query(
        "SELECT * FROM studentlogin WHERE s_email=$1",
        [username]
      );
      if (result.rows.length > 0) {
        const student = result.rows[0];
        const storedPassword = student.s_password;
        bcrypt.compare(password, storedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              //Passed password check
              return cb(null, student);
            } else {
              //Did not pass password check
              return cb(null, false);
            }
          }
        });
      } else {
        return cb(res.redirect("/studentlogin"), "User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      console.log(profile);
      try {
        const result = await db.query(
          "SELECT * FROM studentlogin WHERE s_email = $1",
          [profile.email]
        );
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO studentlogin (s_email,s_password) VALUES ($1,$2)",
            [profile.email, "google"]
          );
          const student = newUser.rows[0];
          cb(null, student);
        } else {
          cb(null, result.rows[0]);
        }
      } catch (err) {
        cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, {
    id: user.admin_id || user.s_email,
    type: user.admin_id ? "admin" : "student",
  });
});

passport.deserializeUser((obj, cb) => {
  if (obj.type === "admin") {
    db.query(
      "SELECT * FROM adminlogin WHERE admin_id=$1",
      [obj.id],
      (err, result) => {
        if (err) {
          return cb(err);
        }
        cb(null, result.rows[0]);
      }
    );
  } else {
    console.log(obj);
    console.log(obj.id);
    db.query(
      "SELECT * FROM studentlogin WHERE s_email=$1",
      [obj.id],
      (err, result) => {
        if (err) {
          return cb(err);
        }
        cb(null, result.rows[0]);
      }
    );
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
