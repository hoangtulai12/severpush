const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// LOAD SERVICE ACCOUNT TỪ ENV
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const tokens = {};

app.post("/register", (req, res) => {
  const { appId, token } = req.body;
  tokens[appId] = token;
  res.json({ ok: true });
});

app.post("/send", async (req, res) => {
  const { fromApp, body } = req.body;
  const target = fromApp === "appA" ? "appB" : "appA";
  const token = tokens[target];

  if (!token) {
    return res.status(400).json({ error: "target not registered" });
  }

  const message = {
    token,
    notification: {
      title: "Push từ Fly.io",
      body
    }
  };

  try {
    const response = await admin.messaging().send(message);
    res.json({ success: true, response });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
