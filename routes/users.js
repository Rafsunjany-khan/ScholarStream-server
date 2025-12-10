const express = require("express");
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid, name, email, photoURL, role } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: "UID and Email are required" });
    }

    const existingUser = await users.findOne({ uid });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = {
      uid,
      name,
      email,
      photoURL,
      role: role || "Student",
    };

    const result = await users.insertOne(newUser);

    res.status(201).json({
      message: "User saved successfully in MongoDB",
      user: { ...newUser, _id: result.insertedId },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//Login
router.post("/login", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid, email } = req.body;

    if (!uid && !email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = uid
      ? await users.findOne({ uid })
      : await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found in MongoDB" });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
