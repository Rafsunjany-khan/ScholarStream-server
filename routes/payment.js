const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

// Create Stripe Payment
router.post("/create-payment-intent", verifyToken, async (req, res) => {
  if (req.user.role !== "Student") {
    return res.status(403).json({ message: "Only students can make payments" });
  }

  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Confirm payment
router.post("/confirm-payment", verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");

  try {
    const { applicationId, paymentStatus } = req.body;

    if (!applicationId || !["paid", "unpaid"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (!ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    const existingApp = await applications.findOne({ _id: new ObjectId(applicationId) });

    if (!existingApp) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (req.user.role === "Student" && existingApp.userId !== req.user.uid) {
      return res.status(403).json({ message: "Students can only confirm their own payments" });
    }

    const updateData = { paymentStatus };

    if (paymentStatus === "paid") {
      updateData.applicationDate = new Date().toISOString().split("T")[0];
    }

    await applications.updateOne({ _id: new ObjectId(applicationId) }, { $set: updateData });

    const updatedApp = await applications.findOne({ _id: new ObjectId(applicationId) });

    res.status(200).json({
      message: `Payment status updated to ${paymentStatus} successfully`,
      application: updatedApp,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update payment status" });
  }
});

module.exports = router;
