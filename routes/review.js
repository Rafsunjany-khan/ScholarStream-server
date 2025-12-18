const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

// Get all reviews for a user
router.get("/user/:email", verifyToken, async (req, res) => {
  try {
    if (req.user.email !== req.params.email && !["Admin", "Moderator"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden access" });
    }

    const db = req.app.locals.db;
    const reviews = await db
      .collection("reviews")
      .find({ userEmail: req.params.email })
      .sort({ reviewDate: -1 })
      .toArray();

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// Get all reviews for a scholarship
router.get("/scholarship/:scholarshipId", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const reviews = await db
      .collection("reviews")
      .find({ scholarshipId: req.params.scholarshipId })
      .sort({ reviewDate: -1 })
      .toArray();

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// Add review
router.post("/", verifyToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const reviewsCollection = db.collection("reviews");

    const { scholarshipId, scholarshipName, universityName, userImage, ratingPoint, reviewComment } = req.body;

    if (!scholarshipId || !reviewComment) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (ratingPoint < 1 || ratingPoint > 5) {
      return res.status(400).json({ message: "Rating must be 1 to 5" });
    }

    const existing = await reviewsCollection.findOne({ scholarshipId, userEmail: req.user.email });

    if (existing) {
      return res.status(400).json({ message: "You already reviewed this scholarship" });
    }

    const review = {
      scholarshipId,
      scholarshipName,
      universityName,
      userName: req.user.name,
      userEmail: req.user.email,
      userImage,
      ratingPoint,
      reviewComment,
      reviewDate: new Date(),
    };

    const result = await reviewsCollection.insertOne(review);

    res.status(201).json({
      message: "Review added successfully",
      review: { _id: result.insertedId, ...review },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add review" });
  }
});

// Update review
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid review ID" });

    const db = req.app.locals.db;
    const reviewsCollection = db.collection("reviews");
    const { reviewComment, ratingPoint } = req.body;

    if (ratingPoint < 1 || ratingPoint > 5) {
      return res.status(400).json({ message: "Rating must be 1 to 5" });
    }

    const review = await reviewsCollection.findOne({ _id: new ObjectId(id) });
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.userEmail !== req.user.email && !["Moderator", "Admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden access" });
    }

    const updated = await reviewsCollection.findOneAndUpdate(
      { _id: review._id },
      { $set: { reviewComment, ratingPoint, reviewDate: new Date() } },
      { returnDocument: "after" }
    );

    res.json({ message: "Review updated successfully", review: updated.value });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update review" });
  }
});

// Delete review
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid review ID" });

    const db = req.app.locals.db;
    const reviewsCollection = db.collection("reviews");

    const review = await reviewsCollection.findOne({ _id: new ObjectId(id) });
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.userEmail !== req.user.email && !["Moderator", "Admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden access" });
    }

    await reviewsCollection.deleteOne({ _id: review._id });

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete review" });
  }
});

module.exports = router;
