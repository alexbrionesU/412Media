const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require('bcrypt');

// Enable CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
// Parse incoming JSON payloads
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
app.use(cookieParser());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
const contribution = 0;

app.post("/register", async (req, res) => {
  try {
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

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user data into the users table, using the hashed password
    const newUser = await pool.query(
      "INSERT INTO users (username, pwd, fname, lname, email, hometown, gender, dob, contribution) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        username,
        hashedPassword,
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
  } catch (err) {
    console.error(err.message);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rowCount === 1) {
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.pwd);

      if (passwordMatch) {
        const token = jwt.sign({ id: user.user_id }, "password");
        res
          .cookie("accessToken", token, {
            httpOnly: true,
          })
          .status(200)
          .json(user);
      } else {
        res.status(404).json("Input Info is incorrect");
      }
    } else {
      res.status(404).json("Input Info is incorrect");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(err);
  }
});

app.get("/", async (req, res) => {
  const token = req.cookies.accessToken;
  let id = -1;
  if (!token) res.status(401).json("Not logged in");
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Token invalid");
    id = userInfo.id;
  });
  try {
    const result = await pool.query(
      `SELECT p.*,  u.user_id AS userId, fname, username
      FROM Photos as p 
      JOIN users AS u ON (p.user_id = u.user_id)  
      LEFT JOIN friends AS f ON (p.user_id = f.friend_id)
      WHERE f.user_id = $1 OR p.user_id = $2
      ORDER BY p.postdate DESC`,
      [id, id]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.get("/tags", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tag_id, tag_text
      FROM tags
      WHERE tags.photo_id = $1`,
      [req.query.postId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.get("/comments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,  u.user_id AS userId, fname, username
      FROM comments as c 
      JOIN users AS u ON (c.user_id = u.user_id) 
      WHERE c.photo_id = $1  
      ORDER BY c.createdAt DESC`,
      [req.query.postId]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.post("/comments", async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const result = await pool.query(
      "INSERT INTO comments (user_id, photo_id, commenttext, createdat) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, req.body.postId, req.body.desc, "2023-4-13"]
    );

    await pool.query(
      "UPDATE users SET contribution = contribution + 1 WHERE users.user_id = $1",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/likes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id FROM likes WHERE photo_id = $1",
      [req.query.postId]
    );
    res.status(200).json(result.rows.map((like) => like.user_id));
  } catch (err) {
    console.error(err);
  }
});

app.post("/likes", async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const result = await pool.query(
      "INSERT INTO likes (photo_id, user_id) VALUES ($1, $2)",
      [req.body.postId, userId]
    );
    return res.status(200).json("Post liked");
  } catch (err) {
    console.error(err);
  }
});

app.delete("/likes", async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const result = await pool.query(
      "DELETE FROM likes WHERE user_id = $1 AND photo_id = $2",
      [userId, req.query.postId]
    );
    res.status(200).json("Post unliked");
  } catch (err) {
    console.error(err);
  }
});

app.get("/", async (req, res) => {
  const token = req.cookies.accessToken;
  let id = -1;
  if (!token) res.status(401).json("Not logged in");
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Token invalid");
    id = userInfo.id;
  });
  try {
    const result = await pool.query(
      `SELECT p.*,  u.user_id AS userId, fname, username
      FROM Photos as p 
      JOIN users AS u ON (p.user_id = u.user_id)  
      LEFT JOIN friends AS f ON (p.user_id = f.friend_id)
      WHERE f.user_id = $1 OR p.user_id = $2
      ORDER BY p.postdate DESC`,
      [id, id]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.get("/tags", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tag_id, tag_text
      FROM tags
      WHERE tags.photo_id = $1`,
      [req.query.postId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.get("/comments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,  u.user_id AS userId, fname, username
      FROM comments as c 
      JOIN users AS u ON (c.user_id = u.user_id) 
      WHERE c.photo_id = $1  
      ORDER BY c.createdAt DESC`,
      [req.query.postId]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.post("/comments", async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const result = await pool.query(
      "INSERT INTO comments (user_id, photo_id, commenttext, createdat) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, req.body.postId, req.body.desc, "2023-4-13"]
    );

    await pool.query(
      "UPDATE users SET contribution = contribution + 1 WHERE users.user_id = $1",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/likes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id FROM likes WHERE photo_id = $1",
      [req.query.postId]
    );
    res.status(200).json(result.rows.map((like) => like.user_id));
  } catch (err) {
    console.error(err);
  }
});

app.post("/likes", async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const result = await pool.query(
      "INSERT INTO likes (photo_id, user_id) VALUES ($1, $2)",
      [req.body.postId, userId]
    );
    return res.status(200).json("Post liked");
  } catch (err) {
    console.error(err);
  }
});

app.delete("/likes", async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const result = await pool.query(
      "DELETE FROM likes WHERE user_id = $1 AND photo_id = $2",
      [userId, req.query.postId]
    );
    res.status(200).json("Post unliked");
  } catch (err) {
    console.error(err);
  }
});

app.get("/contribution", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, contribution FROM users ORDER BY contribution DESC LIMIT 10 "
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/searchComments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(users.user_id) as ocurr, fname, lname FROM users 
      JOIN comments as c 
      ON (users.user_id = c.user_id)
      WHERE c.commentText LIKE concat('%', $1::text, '%')
      GROUP BY users.user_id
      ORDER BY ocurr DESC`,
      [req.query.input]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/searchTags", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.username
      FROM photos AS p
      JOIN Tags AS t ON t.photo_id = p.photo_id
      JOIN Users AS u ON u.user_id = p.user_id
      WHERE t.tag_text LIKE concat('%', $1::text, '%')
      `,
      [`%${req.query.input}%`]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/getFriends", async (req, res) => {
  try {
    const userId = req.query.user_id;
    const result = await pool.query(
      `SELECT
        f.friend_id,
        u.fname AS friend_fname,
        u.lname AS friend_lname
      FROM
        friends AS f
      JOIN
        users AS u
      ON
        f.friend_id = u.user_id
      WHERE
        f.user_id = $1`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/friendsOfFriends", async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const result = await pool.query(
      `SELECT
      u.*
      FROM
          users u
          INNER JOIN friends ff ON u.user_id = ff.friend_id
          INNER JOIN friends f ON ff.user_id = f.friend_id
      WHERE
          f.user_id = $1
          AND ff.friend_id NOT IN
          (SELECT friend_id FROM friends WHERE user_id = $1)`,
      [userId]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
  }
});

app.delete("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    // TODO DROP COMMENTS,LIKES, AND ALBUM_ID FROM THIS SPECIFIC PHOTO_ID
    await pool.query("DELETE FROM Photos WHERE Photo_id = $1", [postId]);

    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/removeFriend", async (req, res) => {
  try {
    const { user_id, friend_id } = req.query;

    await pool.query(
      `DELETE FROM friends
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [user_id, friend_id]
    );
    res.status(200).json({ message: "Friendship removed successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while removing the friendship" });
  }
});
app.post("/addFriend", async (req, res) => {
  try {
    const { user_id, friend_id } = req.query;

    // Generate a unique id for the new friendship record
    const idResult = await pool.query(`SELECT max(id) + 1 AS next_id FROM friends`);
    const newId = idResult.rows[0].next_id || 1;

    await pool.query(
      `INSERT INTO friends (id, user_id, friend_id, dayFormed) VALUES ($1, $2, $3, CURRENT_DATE)`,
      [newId, user_id, friend_id]
    );
    res.status(200).json({ message: "Friendship added successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while adding the friendship" });
  }
});
app.get("/checkFriendship", async (req, res) => {
  try {
    const { user_id, friend_id } = req.query;
    const result = await pool.query(
      `SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [user_id, friend_id]
    );

    if (result.rows.length > 0) {
      res.status(200).json({ status: "friends" });
    } else {
      res.status(200).json({ status: "not_friends" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while checking friendship status" });
  }
});
app.post("/createAlbum", async (req, res) => {
  try {
    const { user_id, name, date } = req.body;

    const idResult = await pool.query(`SELECT max(album_id) + 1 AS next_id FROM albums`);
    const newId = idResult.rows[0].next_id || 1;

    await pool.query(
      `INSERT INTO albums (album_id, user_id, name, date) VALUES ($1, $2, $3, $4)`,
      [newId, user_id, name, date]
    );
    res.status(200).json({ message: "Album created successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while creating the album" });
  }
});



app.get("/contribution", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, contribution FROM users ORDER BY contribution DESC LIMIT 10 "
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/searchComments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(users.user_id) as ocurr, fname, lname FROM users 
      JOIN comments as c 
      ON (users.user_id = c.user_id)
      WHERE c.commentText LIKE concat('%', $1::text, '%')
      GROUP BY users.user_id
      ORDER BY ocurr DESC`,
      [req.query.input]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/popularTags", async (req, res) => {
  try {
    const tags = await pool.query(
      `SELECT COUNT(tag_text) as tagcount, tag_text
        FROM tags
        GROUP BY (tag_text)
        ORDER BY tagcount DESC
        LIMIT 5`
    );
    res.status(200).json(tags.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/findUsername", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username FROM users WHERE user_id = $1",
      [req.query.userId]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
  }
});

app.get("/findAlbums", async (req, res) => {
  try {
    const albums = await pool.query(
      `SELECT * FROM albums
      WHERE user_id = $1`,
      [req.query.userId]
    );
    res.status(200).json(albums);
  } catch (err) {}
});

app.get("/profilePosts", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, username
      FROM photos AS p
      JOIN users AS u ON (u.user_id = p.user_id)
      WHERE p.user_id = $1
      ORDER BY p.postdate DESC`,
      [req.query.userId]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
  }
});

app.get("/findAlbumPosts", async (req, res) => {
  const albumName = req.query.albumName;
  const userId = req.query.userId;
  try {
    const albumId = await pool.query(
      `SELECT album_id FROM albums WHERE user_id = $1 AND name = $2`,
      [userId, albumName]
    );
    const aid = albumId.rows[0].album_id;
    const result = await pool.query(
      `SELECT p.*, u.username 
      FROM photos AS p
      JOIN Users AS u ON p.user_id = u.user_id
      WHERE p.user_id = $1
      AND p.album_id = $2`,
      [userId, aid]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
  }
});

app.post("/deleteAlbum", async (req, res) => {
  try {
    const { album_id } = req.body;
    await pool.query("DELETE FROM albums WHERE album_id = $1", [album_id]);
    res.status(200).json({ message: "Album deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting album" });
  }
});

app.post("/addPhoto", async (req, res) => {
  const imageUrl = req.body.imageUrl;
  const albumName = req.body.albumName;
  const tags = req.body.tags;
  const desc = req.body.desc;

  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json("Not logged in");
  let userId = -1;
  jwt.verify(token, "password", (err, userInfo) => {
    if (err) return res.status(403).json("Invalid Token");
    userId = userInfo.id;
  });

  try {
    const albumId = await pool.query(
      `SELECT album_id 
      FROM albums
      WHERE name = $1`,
      [albumName]
    );

    const aid = albumId.rows[0].album_id;
    const pid = await pool.query(
      `INSERT INTO photos (user_id, caption, postdate, album_id, imageurl)
      VALUES ($1, $2, $3, $4, $5) RETURNING photo_id`,
      [userId, desc, "2023-4-18", aid, imageUrl]
    );
    for (const tag of tags) {
      const inserttag = await pool.query(
        "INSERT INTO tags (tag_text, photo_id, user_id) VALUES ($1, $2, $3)",
        [tag, pid.rows[0].photo_id, userId]
      );
    }
    const contrib = await pool.query(
      "UPDATE users SET contribution = contribution + 1 WHERE users.user_id = $1",
      [userId]
    );
    return res.status(200).json("added post");
  } catch (err) {
    console.error(err);
  }
});
app.listen(3005, () => {
  console.log("server is up and listening on port 3005");
});
