// server.js
require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// đường dẫn tới service account json (đặt cùng thư mục)
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Lưu token tạm (cho demo). Production: dùng DB (Redis/MySQL/MongoDB).
const tokens = {}; // tokens['appA'] = 'fcm_token_string'

app.post('/register', (req, res) => {
  try {
    const { appId, token } = req.body;
    if (!appId || !token) return res.status(400).json({ error: 'appId and token required' });
    tokens[appId] = token;
    console.log('REGISTER', appId, token);
    return res.json({ status: 'ok', appId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// send payload: { fromApp: 'appA', toApp: 'appB' (optional), title, body, data (optional) }
app.post('/send', async (req, res) => {
  try {
    const { fromApp, toApp, title, body, data } = req.body;
    if (!fromApp) return res.status(400).json({ error: 'fromApp required' });

    const targetApp = toApp || (fromApp === 'appA' ? 'appB' : 'appA');
    const token = tokens[targetApp];
    if (!token) return res.status(400).json({ error: 'target token not registered', targetApp });

    const message = {
      token: token,
      notification: {
        title: title || `Message from ${fromApp}`,
        body: body || ''
      },
      data: data || {}
    };

    const response = await admin.messaging().send(message);
    console.log('SENT', response);
    return res.json({ status: 'sent', messageId: response });
  } catch (err) {
    console.error('FCM SEND ERROR', err);
    return res.status(500).json({ error: 'fcm_error', detail: err.toString() });
  }
});

// debug: list tokens
app.get('/tokens', (req, res) => res.json(tokens));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listens on ${PORT}`));
