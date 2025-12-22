const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

// Add new scholarship
router.post("/", verifyToken, async (req, res) => {
  if (!["Admin", "Moderator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

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

// Update scholarship
router.put("/:id", verifyToken, async (req, res) => {
  if (!["Admin", "Moderator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");
    const { id } = req.params;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid scholarship ID" });
    }

    const result = await scholarships.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found or data unchanged" });
    }

    res.status(200).json({ message: "Scholarship updated successfully" });
  } catch (error) {
    console.error("Error updating scholarship:", error);
    res.status(500).json({ message: "Failed to update scholarship" });
  }
});

// Delete scholarship
router.delete("/:id", verifyToken, async (req, res) => {
  if (!["Admin", "Moderator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid scholarship ID" });
    }

    const result = await scholarships.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    res.status(200).json({ message: "Scholarship deleted successfully" });
  } catch (error) {
    console.error("Error deleting scholarship:", error);
    res.status(500).json({ message: "Failed to delete scholarship" });
  }
});

// Get all scholarships with search, filter, sort, and pagination
router.get("/", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const {
      search,
      category,
      subject,
      country,
      sort,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { scholarshipName: { $regex: search, $options: "i" } },
        { universityName: { $regex: search, $options: "i" } },
        { degree: { $regex: search, $options: "i" } },
      ];
    }

    if (category) query.scholarshipCategory = category;
    if (subject) query.subjectCategory = subject;
    if (country) query.universityCountry = country;

    let sortQuery = {};
    if (sort === "fees_asc") sortQuery.applicationFees = 1;
    else if (sort === "fees_desc") sortQuery.applicationFees = -1;
    else if (sort === "date_asc") sortQuery.scholarshipPostDate = 1;
    else if (sort === "date_desc") sortQuery.scholarshipPostDate = -1;

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const totalItems = await scholarships.countDocuments(query);
    const results = await scholarships
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNumber)
      .toArray();

    res.status(200).json({
      message: "Scholarships fetched successfully",
      data: results,
      pagination: {
        totalItems,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalItems / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching scholarships:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get unique categories
router.get("/categories", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const categories = await scholarships.aggregate([{ $group: { _id: "$scholarshipCategory" } }, { $sort: { _id: 1 } }]).toArray();

    res.status(200).json({
      message: "Unique scholarship categories fetched successfully",
      data: categories.map(c => c._id),
    });
  } catch (error) {
    console.error("Error fetching scholarship categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get unique subject categories
router.get("/subjects", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const subjects = await scholarships.aggregate([{ $group: { _id: "$subjectCategory" } }, { $sort: { _id: 1 } }]).toArray();

    res.status(200).json({
      message: "Unique subject categories fetched successfully",
      data: subjects.map(s => s._id),
    });
  } catch (error) {
    console.error("Error fetching subject categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get unique countries
router.get("/countries", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const countries = await scholarships.aggregate([{ $group: { _id: "$universityCountry" } }, { $sort: { _id: 1 } }]).toArray();

    res.status(200).json({
      message: "Unique countries fetched successfully",
      data: countries.map(c => c._id),
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get one scholarship by ID
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

    res.status(200).json({ message: "Scholarship fetched successfully", data: scholarship });
  } catch (error) {
    console.error("Error fetching scholarship:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
