const express = require('express')
const app = express()
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));
console.log(process.env.MONGO_URI)
// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// Routes

// POST /api/users - Create a new user
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: "Unable to create user" });
  }
});

// GET /api/users - Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("_id username");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Unable to fetch users" });
  }
});

// POST /api/users/:_id/exercises - Add an exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    // Find user
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create exercise
    const exerciseDate = date ? new Date(date) : new Date();
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });
    await newExercise.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to add exercise" });
  }
});

// GET /api/users/:_id/logs - Get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    // Find user
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Build query
    const query = { userId: _id };
    if (from) query.date = { ...query.date, $gte: new Date(from) };
    if (to) query.date = { ...query.date, $lte: new Date(to) };

    const exercises = await Exercise.find(query)
      .sort({ date: 1 })
      .limit(parseInt(limit) || 0);

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to fetch logs" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
