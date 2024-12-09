const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors'); // Import cors
const path = require('path');
require('dotenv').config()

const app = express();
const PORT = process.env.PORT;

// Enable CORS
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.use(function (req, res, next) {
  // res.header("Access-Control-Allow-Origin", "*");
  const allowedOrigins = [`http://localhost:${PORT}`, 'https://easy-rail.onrender.com', 'https://easy-rail.netlify.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-credentials", true);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, UPDATE");
  next();
});


// Middleware to parse JSON requests
app.use(express.json());

app.post('/fetch-train-status', async (req, res) => {
  const { trainNumber, dates } = req.body;

  if (!trainNumber || !dates) {
    return res.status(400).json({ error: "Train number and date are required" });
  }

  const url = `${process.env.URI}${trainNumber}?&Date=${dates}`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const elementsData = [];

    $('.row.rs__station-row.flexy').each((index, element) => {
      const station = $(element).find('.rs__station-name.ellipsis').text().trim();
      const arr = $(element).find('.col-xs-2:first span').text().trim();
      var dep = $(element).find('.col-xs-2 span').text().trim();
      var delay = $(element).find('.rs__station-delay').text().trim();
      let status = $(element).find('div.circle-thin').length > 0 ? "upcoming" : "crossed";
      let current = $(element).find('.circle.blink').length > 0 ? "true" : "false";

      if (delay.length > 10) {
        delay = delay.slice(9)
      }
      else {
        delay = "";
      }

      if (dep.length > 6) {
        dep = dep.slice(5, 10);
      }
      else {
        dep = dep
      }

      elementsData.push({
        index,
        station,
        arr,
        dep,
        delay,
        status,
        current,
      });
    });

    return res.status(200).json(elementsData);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch train data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


app.post('/at-station', async (req, res) => {
  const { stnCode } = req.body;

  if (!stnCode) {
    return res.status(400).json({ error: "Invalid Station Code" });
  }

  const url = `https://erail.in/station-live/${stnCode}?DataSource=0&Language=0&Cache=true`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);


    const trainsData = [];
    $('.name').each((i, el) => {
      const trainno = $(el).text().slice(0, 5).trim();
      const trainname = $(el).text().slice(5).trim();
      const routeText = $(el).next("div").text() || "→ ";
      const [source, dest] = routeText.split("→").map(s => s.trim());
      const timeat = $(el).parent("td").next("td").text().slice(0, 5).trim() || "N/A";

      trainsData.push({ i, trainno, trainname, source, dest, timeat });
    });

    return res.status(200).json(trainsData);
  } catch (error) {
    console.error("Error fetching station data:", error.message);
    return res.status(500).json({ error: "Failed to fetch station data" });
  }
});
