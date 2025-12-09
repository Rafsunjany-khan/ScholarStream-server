const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());


const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);


app.get("/", (req, res) => res.send("Server is running"));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
    console.log("MongoDB Connected");
  })
  .catch(err => console.log("MongoDB connection failed:", err));
