const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

// Enable CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
// Parse incoming JSON payloads
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
const contribution = 0;
// Route for user registration
app.post("/register", async (req, res) => {
  try {
    // Destructure user data from the request body
    console.log(req.body);
    const id = 1011;
    const {
      username,
      password,
      firstName,
      lastName,
      email,
      hometown,
      gender,
      dateOfBirth,
    } = req.body;
    const contrib = 0;
    // Insert new user data into the users table
    const newUser = await pool.query(
      "INSERT INTO users (user_id, username, pwd, fname, lname, email, hometown, gender, dob, contribution) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
      [
        id,
        username,
        password,
        firstName,
        lastName,
        email,
        hometown,
        gender,
        dateOfBirth,
        contrib,
      ]
    );

    res.json(newUser.rows[0]);
    console.log("post");
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND pwd = $2",
      [username, password]
    );
    if (result.rowCount === 1) {
      const token = jwt.sign({ id: result.rows[0].user_id }, "password");
      res
        .cookie("accessToken", token, {
          httpOnly: true,
        })
        .status(200)
        .json(result.rows[0]);
    } else {
      res.status(404).json("Input Info is incorrect");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(err);
  }
});

app.post("/albums", async (req, res) => {
    try {
      const { name, userId, desc, img, date } = req.body;
  
      const query = `
        INSERT INTO Albums (User_id, Name, Date)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
  
      const result = await pool.query(query, [userId, name, date]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error saving new album:", error);
      res.status(500).json({ message: "Error saving new album" });
    }
  });


app.listen(3005, () => {
  console.log("server is up and listening on port 3005");
});
