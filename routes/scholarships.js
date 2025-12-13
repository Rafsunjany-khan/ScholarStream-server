const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");


//Add new scholarship
router.post("/", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const {
      scholarshipName,
      universityName,
      universityImage,
      universityCountry,
      universityCity,
      universityWorldRank,
      subjectCategory,
      scholarshipCategory,
      degree,
      tuitionFees,
      applicationFees,
      serviceCharge,
      applicationDeadline,
      scholarshipPostDate,
      postedUserEmail,
    } = req.body;

    // Required fields
    if (!scholarshipName || !universityName || !universityCountry || !universityCity || !subjectCategory || !scholarshipCategory || !degree || !applicationFees || !serviceCharge || !applicationDeadline || !postedUserEmail) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const newScholarship = {
      scholarshipName,
      universityName,
      universityImage: universityImage || "",
      universityCountry,
      universityCity,
      universityWorldRank: universityWorldRank ? Number(universityWorldRank) : null,
      subjectCategory,
      scholarshipCategory,
      degree,
      tuitionFees: tuitionFees ? Number(tuitionFees) : 0,
      applicationFees: Number(applicationFees),
      serviceCharge: Number(serviceCharge),
      applicationDeadline,
      scholarshipPostDate: scholarshipPostDate || new Date().toISOString().split("T")[0],
      postedUserEmail,
      createdAt: new Date(),
    };

    const result = await scholarships.insertOne(newScholarship);

    res.status(201).json({
      message: "Scholarship added successfully",
      data: { ...newScholarship, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error adding scholarship:", error);
    res.status(500).json({ message: "Failed to add scholarship" });
  }
});


//Get all scholarships
router.get("/", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const allScholarships = await scholarships.find({}).toArray();

    res.status(200).json({
      message: "All scholarships fetched successfully",
      data: allScholarships,
    });
  } catch (error) {
    console.error("Error fetching scholarships:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Get all unique categories
router.get("/categories", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const categories = await scholarships.aggregate([
      { $group: { _id: "$scholarshipCategory" } },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.status(200).json({
      message: "Unique scholarship categories fetched successfully",
      data: categories.map(c => c._id),
    });
  } catch (error) {
    console.error("Error fetching scholarship categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Get all unique subject categories
router.get("/subjects", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const subjects = await scholarships.aggregate([
      { $group: { _id: "$subjectCategory" } },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.status(200).json({
      message: "Unique subject categories fetched successfully",
      data: subjects.map(s => s._id),
    });
  } catch (error) {
    console.error("Error fetching subject categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Get all unique countries
router.get("/countries", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const countries = await scholarships.aggregate([
      { $group: { _id: "$universityCountry" } },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.status(200).json({
      message: "Unique countries fetched successfully",
      data: countries.map(c => c._id),
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ message: "Server error" });
  }
});


//Get one scholarship by ID
router.get("/:id", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid scholarship ID" });
    }

    const scholarship = await scholarships.findOne({ _id: new ObjectId(id) });

    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    res.status(200).json({
      message: "Scholarship fetched successfully",
      data: scholarship,
    });
  } catch (error) {
    console.error("Error fetching scholarship:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
