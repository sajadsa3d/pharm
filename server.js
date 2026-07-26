const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// API endpoint to proxy the hit counter
app.get('/api/hit', (req, res) => {
  const type = req.query.type === 'visitors' ? 'visitors' : 'visits';
  
  // Make a request to counterapi.dev from the server (bypasses adblockers)
  const url = `https://api.counterapi.dev/v1/marwasalim/${type}/up`;
  
  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        res.json(JSON.parse(data));
      } catch(e) {
        res.status(500).json({error: 'Failed to parse API response'});
      }
    });
  }).on('error', (err) => {
    res.status(500).json({error: 'Failed to reach counter API'});
  });
});

// API endpoint to get current stats
app.get('/api/stats', (req, res) => {
  const type = req.query.type === 'visitors' ? 'visitors' : 'visits';
  const url = `https://api.counterapi.dev/v1/marwasalim/${type}`;
  
  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if(parsed.code === 400) {
          // Record not found (never incremented), default to 0
          return res.json({ count: 0 });
        }
        res.json(parsed);
      } catch(e) {
        res.status(500).json({error: 'Failed to parse API response'});
      }
    });
  }).on('error', (err) => {
    res.status(500).json({error: 'Failed to reach counter API'});
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
