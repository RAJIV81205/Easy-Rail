const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Import cors
const path = require('path');
require('dotenv').config()

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.use(function (req, res, next) {
  // res.header("Access-Control-Allow-Origin", "*");
  const allowedOrigins = [`http://localhost:${PORT}`, 'http://localhost:8000', 'https://easy-rail.netlify.app'];
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

const toDdMmYyyy = (input) => {
  if (!input) return null;
  if (input === 'today') return 'today';
  // Accept YYYY-MM-DD from <input type="date"> and convert to DD-MM-YYYY
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(input)) return input;
  return input;
};

app.post('/fetch-train-status', async (req, res) => {
  const { trainNumber, dates } = req.body;

  if (!trainNumber || !dates) {
    return res.status(400).json({ error: "Train number and date are required" });
  }

  const dateParam = toDdMmYyyy(dates);

  try {
    const { data } = await irctcApi.get(`/api/trackTrain/${trainNumber}/${dateParam}`);
    const root = (data && data.success && data.data) ? data.data : data;
    const schedule = root.schedule || root.Schedule || root.stations || root.stationList || [];
    const live = root.liveStatus || root.current || null;

    const elementsData = schedule.map((station, index) => {
      const arrivalDelay = station.arrivalDelay || station.delay || '';
      const departureDelay = station.departureDelay || '';
      const status = (arrivalDelay && arrivalDelay !== '-') ? 'crossed' : 'upcoming';
      const isCurrent = live && (live.stationCode || live.station) &&
        (live.stationCode === station.stationCode || live.station === station.stationName);
      return {
        index,
        station: station.stationName || station.StationName || station.station || station.name,
        arr: station.arrivalTime || station.ArrivalTime || station.arrival || station.arr,
        dep: station.departureTime || station.DepartureTime || station.departure || station.dep,
        delay: arrivalDelay === '-' ? '' : arrivalDelay,
        status,
        current: isCurrent ? 'true' : 'false',
      };
    });

    return res.status(200).json(elementsData);
  } catch (error) {
    console.error('Error fetching train status:', error.message);
    return res.status(500).json({ error: "Failed to fetch train data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


app.post('/at-station', async (req, res) => {
  const { stnCode, hrs } = req.body;

  if (!stnCode) {
    return res.status(400).json({ error: "Invalid Station Code" });
  }

  const validHrs = [2, 4, 8];
  const hrsParam = validHrs.includes(Number(hrs)) ? Number(hrs) : 2;

  try {
    const { data } = await irctcApi.get(`/api/liveAtStation/${stnCode.toUpperCase()}`, {
      params: { hrs: hrsParam },
    });

    // Upstream: { success, data: { summary, totalTrains, trains: [ ... ] } }
    const root = (data && data.success && data.data) ? data.data : data;
    const list = Array.isArray(root) ? root : (root.trains || root.trainList || []);

    const trainsData = list.map((t, i) => {
      const arrival = t.arrival || {};
      const departure = t.departure || {};
      // For a terminating train, departure.actual === "DSTN" -> use arrival.actual.
      // For a passing train, arrival.actual may equal dest code or be missing -> use departure.actual.
      const depActual = (departure.actual || "").toUpperCase();
      const arrActual = (arrival.actual || "").toUpperCase();
      let timeat = "N/A";
      if (depActual && depActual !== "DSTN" && depActual !== "SRC") {
        timeat = departure.actual;
      } else if (arrActual && arrActual !== "DSTN" && arrActual !== "SRC") {
        timeat = arrival.actual;
      } else if (arrival.actual) {
        timeat = arrival.actual;
      } else if (departure.actual) {
        timeat = departure.actual;
      }

      return {
        i,
        trainno: t.trainNo || "",
        trainname: t.trainName || "",
        source: t.sourceName ? `${t.sourceName} (${t.source})` : (t.source || ""),
        dest: t.destName ? `${t.destName} (${t.dest})` : (t.dest || ""),
        timeat,
        // Extra fields the UI may want later
        platform: t.platform,
        cancelled: t.cancelled,
        delay: arrival.delay || departure.delay,
      };
    });

    return res.status(200).json(trainsData);
  } catch (error) {
    console.error("Error fetching station data:", error.message);
    return res.status(500).json({ error: "Failed to fetch station data" });
  }
});

app.post('/pnr-status', async (req, res) => {
  const { pnr } = req.body;

  if (!pnr || !/^\d{10}$/.test(pnr)) {
    return res.status(400).json({ error: "Invalid PNR Number" });
  }

  const url = `https://irctc-api.rajivdubey.dev/api/checkPNRStatus/${pnr}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'x-api-key': process.env.IRCTC_API_KEY,
        'accept': 'application/json',
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || { error: "Failed to fetch PNR status" };
    console.error('Error fetching PNR status:', error.message);
    return res.status(status).json(message);
  }
});

const irctcApi = axios.create({
  baseURL: 'https://irctc-api.rajivdubey.dev',
  headers: {
    'x-api-key': process.env.IRCTC_API_KEY,
    'accept': 'application/json',
  },
});

app.post('/train-info', async (req, res) => {
  const { trainNumber } = req.body;
  if (!trainNumber || !/^\d{5}$/.test(trainNumber)) {
    return res.status(400).json({ error: "Train number must be 5 digits" });
  }
  try {
    const { data } = await irctcApi.get(`/api/getTrainInfo/${trainNumber}`);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Failed to fetch train info" });
  }
});

app.post('/track-train', async (req, res) => {
  const { trainNumber, date } = req.body;
  if (!trainNumber || !/^\d{5}$/.test(trainNumber)) {
    return res.status(400).json({ error: "Train number must be 5 digits" });
  }
  if (!date) {
    return res.status(400).json({ error: "Date is required (DD-MM-YYYY or 'today')" });
  }
  try {
    const { data } = await irctcApi.get(`/api/trackTrain/${trainNumber}/${date}`);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Failed to track train" });
  }
});

app.post('/live-at-station', async (req, res) => {
  const { stnCode, hrs } = req.body;
  if (!stnCode) {
    return res.status(400).json({ error: "Station code is required" });
  }
  const validHrs = [2, 4, 8];
  const hrsParam = validHrs.includes(Number(hrs)) ? Number(hrs) : 2;
  try {
    const { data } = await irctcApi.get(`/api/liveAtStation/${stnCode.toUpperCase()}`, {
      params: { hrs: hrsParam },
    });
    return res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Failed to fetch station live data" });
  }
});

app.post('/search-trains', async (req, res) => {
  const { from, to, date } = req.body;
  if (!from || !to) {
    return res.status(400).json({ error: "From and To station codes are required" });
  }
  try {
    const params = {};
    if (date) params.date = date;
    const { data } = await irctcApi.get(
      `/api/searchTrainBetweenStations/${from.toUpperCase()}/${to.toUpperCase()}`,
      { params }
    );
    return res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Failed to search trains" });
  }
});

app.post('/get-availability', async (req, res) => {
  const { trainNo, from, to, date, classCode, quota } = req.body;
  if (!trainNo || !from || !to || !date || !classCode || !quota) {
    return res.status(400).json({ error: "trainNo, from, to, date, classCode and quota are required" });
  }
  try {
    const { data } = await irctcApi.get(
      `/api/getAvailability/${trainNo}/${from.toUpperCase()}/${to.toUpperCase()}/${date}/${classCode.toUpperCase()}/${quota.toUpperCase()}`
    );
    return res.status(200).json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Failed to fetch availability" });
  }
});

const COMMON_CLASSES = ['SL', '3A', '2A', '1A', '2S', 'CC', 'EC'];

app.post('/search-with-availability', async (req, res) => {
  const { from, to, date, quota = 'GN' } = req.body;
  if (!from || !to || !date) {
    return res.status(400).json({ error: "from, to and date are required" });
  }

  try {
    const { data } = await irctcApi.get(
      `/api/searchTrainBetweenStations/${from.toUpperCase()}/${to.toUpperCase()}`,
      { params: { date } }
    );
    // Upstream: { success, data: [ { train_no, train_name, from_stn_code, to_stn_code, ... } ] }
    const trainList = (data && data.success && Array.isArray(data.data))
      ? data.data
      : (Array.isArray(data) ? data : []);

    const enriched = await Promise.all(trainList.map(async (t) => {
      const trainNumber = t.train_no;
      const fromCode = t.from_stn_code;
      const toCode = t.to_stn_code;

      // Per-class availability calls
      const classes = await Promise.all(COMMON_CLASSES.map(async (cls) => {
        try {
          const { data: cData } = await irctcApi.get(
            `/api/getAvailability/${trainNumber}/${fromCode}/${toCode}/${date}/${cls}/${quota}`
          );
          const cRoot = (cData && cData.success && cData.data) ? cData.data : cData;
          const status = cRoot.status || cRoot.availabilityStatus || '';
          const fare = cRoot.fare || cRoot.totalFare || cRoot.price;
          return {
            classType: cls,
            fare: fare ?? null,
            availabilityDisplayName: status || 'Check',
            prediction: cRoot.prediction ?? '--%',
          };
        } catch (e) {
          return { classType: cls, fare: null, availabilityDisplayName: 'N/A', prediction: '--%' };
        }
      }));

      return {
        trainNumber,
        trainName: t.train_name || '',
        departureTime: t.from_time || '',
        arrivalTime: t.to_time || '',
        fromStnCode: fromCode,
        toStnCode: toCode,
        duration: (() => {
          // travel_time is "HH:MM hrs" -> total minutes
          const m = /(\d+):(\d+)/.exec(t.travel_time || "");
          return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
        })(),
        hasPantry: false,
        avlClassesSorted: COMMON_CLASSES,
        availabilityCache: Object.fromEntries(classes.map(c => [c.classType, c])),
      };
    }));

    return res.status(200).json({ data: { trainList: enriched } });
  } catch (error) {
    console.error('Error searching with availability:', error.message);
    return res.status(500).json({ error: "Failed to search trains with availability" });
  }
});

app.post('/trains-between', async (req, res) => {
  const { from, to, date } = req.body;
  if (!from || !to) {
    return res.status(400).json({ success: false, data: "From and To station codes are required" });
  }

  try {
    const params = {};
    if (date) params.date = date;
    const { data } = await irctcApi.get(
      `/api/searchTrainBetweenStations/${from.toUpperCase()}/${to.toUpperCase()}`,
      { params }
    );

    // Upstream: { success, data: [ { train_no, train_name, ... }, ... ] }
    const list = (data && data.success && Array.isArray(data.data))
      ? data.data
      : (Array.isArray(data) ? data : []);

    const sorted = [...list].sort((a, b) => {
      const [ah, am] = (a.from_time || "0:0").split(":").map(Number);
      const [bh, bm] = (b.from_time || "0:0").split(":").map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    return res.status(200).json({ success: true, data: sorted, time_stamp: Date.now() });
  } catch (error) {
    console.error("Error fetching trains between stations:", error.message);
    const status = error.response?.status || 500;
    return res.status(status).json({ success: false, data: "An error occurred while processing train data." });
  }
});
