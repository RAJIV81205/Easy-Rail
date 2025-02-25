

document.addEventListener("DOMContentLoaded", () => {
  var currentPage = window.location.pathname.split("/").pop();
  if (currentPage == "") {
    currentPage = "index.html";
  }
  const navLinks = document.querySelectorAll(".navbar .box a");



  const urlParams = new URLSearchParams(window.location.search);
  const trainNo = urlParams.get('trainno');


  if (trainNo) {
    fetchTrainDetails(trainNo);
  }







  navLinks.forEach(link => {
    const linkText = link.textContent.trim();
    const linkHref = link.getAttribute("href");

    if (currentPage === linkHref || linkHref === "#") {
      link.parentElement.classList.add("active-box");


    }
    else {
      link.parentElement.classList.remove("active-box");
    }
  });

  var current = new Date().toLocaleDateString()
  current = current.split("/")

  try {
    document.getElementById("date").value = current[2] + "-" + current[1] + "-" + current[0];

  } catch (error) {
    console.log("Not on main page")

  }

  try {
    document.getElementById("dates").value = current[2] + "-" + current[1] + "-" + current[0];


  } catch (error) {
    console.log("Not on live-status page")

  }

  try {
    document.getElementById("aval-date").value = current[2] + "-" + current[1] + "-" + current[0];


  } catch (error) {
    console.log("Not on live-status page")

  }


  try {
    const dateTabs = document.querySelectorAll('.date-tab');
    const dateInput = document.getElementById('aval-date');

    dateTabs.forEach(tab => {
      tab.addEventListener('click', function () {

        dateTabs.forEach(t => t.classList.remove('active'));

        this.classList.add('active');


        updateDateInput(this.id);
      });
    })

  } catch (error) {
    console.error("Not on Aval Page", error)

  }



});


const hamburger = document.getElementById('hamburger');
const navbar = document.getElementById('navbar');

hamburger.addEventListener('click', () => {
  navbar.classList.toggle('active');
});



function getTrainNumber() {
  const trainin = document.getElementById("train-number").value.trim();
  const suggestionsContainer = document.getElementById("train-suggestions");


  fetch('trains.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Filter trains based on user input
      const filteredTrains = data.filter(train =>
        train.trainName.toLowerCase().includes(trainin.toLowerCase()) ||
        train.trainno.toLowerCase().includes(trainin.toLowerCase())
      );

      // Limit to 5 results
      const limitedTrains = filteredTrains;

      // Clear previous suggestions
      suggestionsContainer.innerHTML = "";
      suggestionsContainer.style.display = "flex";

      if (trainin.length < 1) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
        return;
      }

      // Populate suggestions
      limitedTrains.forEach(train => {
        const suggestion = document.createElement("div");
        suggestion.classList.add("suggestion-item");
        suggestion.textContent = `${train.trainName} (${train.trainno})`;

        // Add click event to populate input and clear suggestions
        suggestion.addEventListener("click", () => {
          document.getElementById("train-number").value = `${train.trainno}`;
          suggestionsContainer.innerHTML = "";
          suggestionsContainer.style.display = "none";
        });

        suggestionsContainer.appendChild(suggestion);
      });
    })
    .catch(error => {
      console.error("Error fetching train data:", error);
      suggestionsContainer.innerHTML = `<div class="error-message">Unable to load suggestions</div>`;
    });
}









async function fetchTrainDetails(trainNo) {
  const trainNumber = document.getElementById("train-number").value.trim() || sessionStorage.getItem("selectedTrainNumber") || trainNo;
  const trainTable = document.getElementById("train-table");
  const trainTableBody = document.getElementById("train-table-body");
  const trainScheduleBody = document.getElementById('train-schedule');
  trainScheduleBody.innerHTML = "";
  document.getElementById("schedule-container").style.display = "none";


  trainTable.style.display = "none";

  if (trainNumber.length != 5) {
    alert("Please enter a valid train number!");
    return;
  }

  try {
    const response = await fetch(
      `https://erail.in/rail/getTrains.aspx?TrainNo=${trainNumber}&DataSource=0&Language=0&Cache=true`
    );
    const rawData = await response.text();



    const trainInfo = CheckTrain(rawData);

    if (trainInfo.success) {
      const data = trainInfo.data;


      trainTableBody.innerHTML = "";
      document.getElementById("train-details").style.padding = "10px";
      document.getElementById("train-details").style.border = "2px solid black";
      const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const runningDaysFormatted = data.running_days
        .split("")
        .map((bit, index) => (bit === "1" ? `${weekdays[index]}` : "_"))
        .join(" ");



      const details = [
        { field: "Train Number", value: data.train_no },
        { field: "Train Name", value: data.train_name },
        { field: "Source", value: `${data.from_stn_name} (${data.from_stn_code})` },
        { field: "Destination", value: `${data.to_stn_name} (${data.to_stn_code})` },
        { field: "Departure", value: data.from_time },
        { field: "Arrival", value: data.to_time },
        { field: "Travel Time", value: data.travel_time },
        { field: "Running Days", value: `${runningDaysFormatted}` },
        { field: "Train ID", value: data.train_id }
      ];

      details.forEach((detail) => {
        const row = document.createElement("tr");
        const fieldCell = document.createElement("td");
        const valueCell = document.createElement("td");

        fieldCell.textContent = detail.field;
        valueCell.textContent = detail.value;

        row.appendChild(fieldCell);
        row.appendChild(valueCell);
        trainTableBody.appendChild(row);
      });


      trainTable.style.display = "table";
    } else {
      const trainScheduleBody = document.getElementById('train-schedule');
      document.getElementById("schedule-container").style.display = "none";
      trainScheduleBody.innerHTML = "";
      trainTableBody.innerHTML = `<tr><td colspan="2">Error: ${trainInfo.data}</td></tr>`;
      trainTable.style.display = "table";
    }
  } catch (error) {
    trainTableBody.innerHTML = `<tr><td colspan="2">Error fetching train details. Please try again later.</td></tr>`;
    trainTable.style.display = "table";
  }
}


function CheckTrain(string) {
  try {
    let obj = {};
    let retval = {};
    let data = string.split("~~~~~~~~");

    if (
      data[0] === "~~~~~Please try again after some time." ||
      data[0] === "~~~~~Train not found"
    ) {
      retval["success"] = false;
      retval["data"] = data[0].replaceAll("~", "");
      return retval;
    }

    let data1 = data[0].split("~").filter((el) => el !== "");
    if (data1[1].length > 6) data1.shift();

    obj["train_no"] = data1[1].replace("^", "");
    obj["train_name"] = data1[2];
    obj["from_stn_name"] = data1[3];
    obj["from_stn_code"] = data1[4];
    obj["to_stn_name"] = data1[5];
    obj["to_stn_code"] = data1[6];
    obj["from_time"] = data1[11].replace(".", ":");
    obj["to_time"] = data1[12].replace(".", ":");
    obj["travel_time"] = data1[13].replace(".", ":") + " hrs";
    obj["running_days"] = data1[14];

    let data2 = data[1].split("~").filter((el) => el !== "");
    obj["type"] = data2[11];
    obj["train_id"] = data2[12];
    getRoute(data2[12]);

    retval["success"] = true;
    retval["data"] = obj;

    return retval;
  } catch (err) {
    console.error(err);
  }
}





async function getRoute(train_id) {
  const response = await fetch(`https://erail.in/data.aspx?Action=TRAINROUTE&Password=2012&Data1=${train_id}&Data2=0&Cache=true`);
  const rawData = await response.text();


  const parsedData = parseTrainRoute(rawData);;
  console.log(parsedData);
  const trainScheduleBody = document.getElementById('train-schedule');
  document.getElementById("schedule-container").style.display = "flex";
  trainScheduleBody.innerHTML = "";

  parsedData.data.forEach((train) => {
    const row = document.createElement('tr');
    row.innerHTML = `
                <td>${train.source_stn_name}</td>
                <td>${train.source_stn_code}</td>
                <td>${train.arrive}</td>
                <td>${train.depart}</td>
                <td>${train.distance}</td>
            `;
    trainScheduleBody.appendChild(row);
  });

}






function parseTrainRoute(string) {
  try {

    let data = string.split("~^");


    let arr = data.map((item) => {
      let details = item.split("~").filter((el) => el !== "");
      return {
        source_stn_name: details[2],
        source_stn_code: details[1],
        arrive: details[3].replace(".", ":"),
        depart: details[4].replace(".", ":"),
        distance: details[6],
        day: details[7],
        zone: details[9],
      };
    });


    return {
      success: true,
      time_stamp: Date.now(),
      data: arr,
    };
  } catch (err) {

    console.error("Error parsing train route data:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}





let debounceTimer;



function searchStationFrom() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    input = document.getElementById("from").value;
    if (input.length < 2) {
      const suggestionsBox = document.getElementById("suggestions-from");
      suggestionsBox.style.display = "none";
      suggestionsBox.innerHTML = "";
      return;
    }
    filterStationFrom(input);
  }, 300);
}





function filterStationFrom(input) {
  const suggestionsBox = document.getElementById("suggestions-from");

  if (input) {
    fetch('stations.json')
      .then(response => response.json())
      .then(data => {


        const stationnaam = data.stations;



        const filteredStations = stationnaam.filter(station =>
          station.stnName.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCode.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCity.toLowerCase().includes(input.toLowerCase())
        );



        if (filteredStations.length === 0) {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = "<div class='no-results'>No results found</div>";
        } else {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = "";
          filteredStations.forEach(station => {
            const suggestionItem = document.createElement("div");
            suggestionItem.classList.add("suggestion-item");
            suggestionItem.textContent = `${station.stnName} (${station.stnCode})`;
            suggestionItem.addEventListener("click", () => {
              document.getElementById("from").value = `${station.stnName} (${station.stnCode})`;
              sessionStorage.setItem("from", `${station.stnCode}`)
              suggestionsBox.style.display = "none";
              suggestionsBox.innerHTML = "";
            });
            suggestionsBox.appendChild(suggestionItem);
          });
        }
      })
      .catch(error => {
        console.error('Fetch error:', error);
      });
  } else {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
  }
}













let debounceTimerTo;

function searchStationTo() {
  clearTimeout(debounceTimerTo);
  debounceTimerTo = setTimeout(() => {
    input = document.getElementById("to").value;
    if (input.length < 2) {
      const suggestionsBox = document.getElementById("suggestions-to");
      suggestionsBox.style.display = "none";
      suggestionsBox.innerHTML = "";
      return;
    }
    filterStationTo(input);
  }, 300);
}





function filterStationTo(input) {
  const suggestionsBox = document.getElementById("suggestions-to");

  if (input) {
    fetch('stations.json')
      .then(response => response.json())
      .then(data => {


        const stationnaam = data.stations;


        // Filter stations
        const filteredStations = stationnaam.filter(station =>
          station.stnName.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCode.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCity.toLowerCase().includes(input.toLowerCase())
        );


        // Display suggestions
        if (filteredStations.length === 0) {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = "<div class='no-results'>No results found</div>";
        } else {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = ""; // Clear previous suggestions

          filteredStations.forEach(station => {
            const suggestionItem = document.createElement("div");
            suggestionItem.classList.add("suggestion-item");
            suggestionItem.textContent = `${station.stnName} (${station.stnCode})`;
            suggestionItem.addEventListener("click", () => {
              document.getElementById("to").value = `${station.stnName} (${station.stnCode})`; // Set input value
              sessionStorage.setItem("to", `${station.stnCode}`)
              suggestionsBox.style.display = "none"; // Clear suggestions
              suggestionsBox.innerHTML = ""; // Clear suggestions
            });
            suggestionsBox.appendChild(suggestionItem);
          });
        }
      })
      .catch(error => {
        console.error('Fetch error:', error);
      });
  } else {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = ""; // Clear suggestions if input is empty
  }
}







function getDayIndex(dateString) {
  const date = new Date(dateString);
  const jsDayIndex = date.getDay(); // JS day index (0 = Sunday, 6 = Saturday)

  // Adjust for Monday as the first day
  return (jsDayIndex + 6) % 7;
}




try {
  document.getElementById("main-search").addEventListener("click", function () {
    const from = sessionStorage.getItem("from").toLowerCase().trim();
    const to = sessionStorage.getItem("to").toLowerCase().trim();



    // Check if both input fields have values
    if (!from || !to) {
      alert("Please enter both 'From' and 'To' stations.");
      return;
    }

    const apiUrl = `https://erail.in/rail/getTrains.aspx?Station_From=${from}&Station_To=${to}&DataSource=0&Language=0&Cache=true`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        return response.text();
      })
      .then(data => {
        const result = parseTrainData(data);

        if (result.success) {
          console.log("Trains Found:", result.data);
          displayTrains(result.data); // Display trains if found
        } else {
          console.warn("No trains found:", result.data);
          alert(result.data); // Alert user if no trains are found
        }
      })
      .catch(error => {
        console.error("Fetch error:", error);
        alert("An error occurred while fetching train data. Please try again.");
      });
  });
} catch (err) {
  console.log("Not on Main page")
}

function parseTrainData(data) {
  try {
    const arr = [];
    const rawData = data.split("~~~~~~~~").filter((el) => el.trim() !== ""); // Filter valid data


    // Check for error messages
    if (rawData[0].includes("No direct trains found")) {
      return {
        success: false,
        time_stamp: Date.now(),
        data: "No direct trains found between the selected stations.",
      };
    }

    if (
      rawData[0].includes("Please try again after some time.") ||
      rawData[0].includes("From station not found") ||
      rawData[0].includes("To station not found")
    ) {
      return {
        success: false,
        time_stamp: Date.now(),
        data: rawData[0].replace(/~/g, ""),
      };
    }

    // Parse each train's details
    for (let i = 0; i < rawData.length; i++) {
      const trainData = rawData[i].split("~^");
      const nextData = rawData[i + 1] || ""; // Ensure next data exists or use an empty string
      const trainData2 = nextData.split("~^");



      if (trainData.length === 2) {
        const details = trainData[1].split("~").filter((el) => el.trim() !== "");
        const details2 = trainData2[0]
          ? trainData2[0].split("~").filter((el) => el.trim() !== "")
          : []; // Handle empty trainData2 safely



        if (details.length >= 14) {
          arr.push({
            train_no: details[0],
            train_name: details[1],
            source_stn_name: details[2],
            source_stn_code: details[3],
            dstn_stn_name: details[4],
            dstn_stn_code: details[5],
            from_stn_name: details[6],
            from_stn_code: details[7],
            to_stn_name: details[8],
            to_stn_code: details[9],
            from_time: details[10].replace(".", ":"),
            to_time: details[11].replace(".", ":"),
            travel_time: details[12].replace(".", ":") + " hrs",
            running_days: details[13],
            distance: details2[18] || "N/A", // Use "N/A" if distance is unavailable
            halts: details2[7] - details2[4] - 1
          });
        }
      }
    }
    arr.sort((a, b) => {
      const timeA = a.from_time.split(":").map(Number);
      const timeB = b.from_time.split(":").map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });


    return {
      success: true,
      time_stamp: Date.now(),
      data: arr,
    };
  } catch (err) {
    console.error("Parsing error:", err);
    return {
      success: false,
      time_stamp: Date.now(),
      data: "An error occurred while processing train data.",
    };
  }
}









function displayTrains(trains) {
  const resultContainer = document.getElementById("train-results");
  resultContainer.innerHTML = "";
  const from = sessionStorage.getItem("from").trim();
  const to = sessionStorage.getItem("to").trim();
  document.getElementById("from").value = "";
  document.getElementById("to").value = "";


  const selectedDate = document.getElementById("date").value;

  const selectedDayIndex = getDayIndex(selectedDate); // Get the day index (0 = Monday)


  if (trains.length === 0) {
    resultContainer.innerHTML = "<p>No trains found for the selected route.</p>";
    return;
  }


  resultContainer.innerHTML = `<h1>List of Trains from ${from} to ${to}.</h1>`;
  trains.forEach(train => {

    if (train.running_days[selectedDayIndex] !== "1") return;

    const trainItem = document.createElement("div");
    trainItem.classList.add("train-item");

    const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
    const runningDaysFormatted = train.running_days
      .split("")
      .map((bit, index) => (bit === "1" ? weekdays[index] : `<span class="inactive">${weekdays[index]}</span>`))
      .join(" ");

    trainItem.innerHTML = `
      <div class="train-header">
        <h2>${train.train_name} (${train.train_no})</h2>
        <span class="running-days">Runs on: ${runningDaysFormatted}</span>
      </div>
      <div class="train-body">
        <div>
          <strong>${train.from_stn_code} - ${train.from_time}</strong>
          <p>${train.from_stn_name}</p>
        </div>
        <div>
          <span>🚆</span>
          <p>${train.travel_time}</p>
          <p>${train.halts || "N/A"} halts | ${train.distance || "N/A"} kms</p>
        </div>
        <div>
          <strong>${train.to_stn_code} - ${train.to_time}</strong>
          <p>${train.to_stn_name}</p>
        </div>
      </div>
      <div class="train-footer">
        <span>${train.source_stn_name} ➡ ${train.dstn_stn_name}</span>
        <a href="train-search.html?trainno=${train.train_no}" class="timetable-link" id="timeTableLink" data-train-number="${train.train_no}">Time Table</a>
      </div>
    `;

    resultContainer.appendChild(trainItem);
    resultContainer.scrollIntoView();




  });
}

function fetchPnrDetails() {
  const pnr = document.getElementById("pnr-number").value;
  if (pnr.length != 10) {
    alert("Invalid PNR Number");
    return;
  }
  getPNRdata(pnr)

}

function getPNRdata(pnr) {
  const url = `https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/${pnr}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': 'b0075d9fa8msh81b2609e08877a8p14ff09jsn738ea7672cad',
      'x-rapidapi-host': 'irctc-indian-railway-pnr-status.p.rapidapi.com'
    }
  };

  try {
    fetch(url, options)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        showPNRdetails(data);
      })
  } catch (error) {
    console.error(error);
  }
}

function showPNRdetails(data) {
  if (data.success && data.data) {
    const journeyDetails = data.data;
    const DOJ = new Date(journeyDetails.dateOfJourney).toLocaleDateString();

    let passengerRows = journeyDetails.passengerList.map(passenger => `
          <tr>
              <td>${passenger.passengerSerialNumber}</td>
              <td>${passenger.bookingStatusDetails}</td>
              <td>${passenger.currentStatusDetails}</td>
          </tr>
      `).join('');

    let output = `
          <h2> PNR Status Details </h2>
          <table border="1" cellpadding="10">
              <tr>
                  <th>PNR Number</th>
                  <td>${journeyDetails.pnrNumber}</td>
              </tr>
              <tr>
                  <th>Date of Journey</th>
                  <td>${DOJ}</td>
              </tr>
              <tr>
                  <th>Train Number</th>
                  <td>${journeyDetails.trainNumber}</td>
              </tr>
              <tr>
                  <th>Train Name</th>
                  <td>${journeyDetails.trainName}</td>
              </tr>
              <tr>
                  <th>Source Station</th>
                  <td>${journeyDetails.sourceStation}</td>
              </tr>
              <tr>
                  <th>Destination Station</th>
                  <td>${journeyDetails.destinationStation}</td>
              </tr>
              <tr>
                  <th>Boarding Point</th>
                  <td>${journeyDetails.boardingPoint}</td>
              </tr>
              <tr>
                  <th>Journey Class</th>
                  <td>${journeyDetails.journeyClass}</td>
              </tr>
              <tr>
                  <th>Chart Status</th>
                  <td>${journeyDetails.chartStatus}</td>
              </tr>
              <tr>
                  <th>Total Distance</th>
                  <td>${journeyDetails.distance} km</td>
              </tr>
              <tr>
                  <th>Fare</th>
                  <td>₹${journeyDetails.bookingFare}</td>
              </tr>
          </table>

          <h3>Passenger Details</h3>
          <table border="1" cellpadding="10">
              <tr>
                  <th>Passenger No.</th>
                  <th>Booking Status</th>
                  <th>Current Status</th>
              </tr>
              ${passengerRows}
          </table>
      `;
    document.getElementById('output').innerHTML = output;
  }
  else {
    document.getElementById('output').innerHTML = "<p id='error'>No data found for the provided PNR number.</p>";
  }
};
















async function getStatus() {
  const container = document.getElementById('trainStatusContainer');
  container.innerHTML = '';

  console.log("Form submitted");

  const trainNumber = document.getElementById('trainNumber').value;

  if (trainNumber.length !== 5) {
    alert("WRONG TRAIN NUMBER");
    return;
  }

  document.getElementById("train-loader").style.display = "flex";
  document.getElementById("output1").innerText = "Fetching Train Details........🔍";
  const dates = document.getElementById('dates').value;

  console.log("Train Number:", trainNumber);
  console.log("Date:", dates);

  try {
    const response = await fetch('https://easy-rail.onrender.com/fetch-train-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainNumber, dates }),
    });

    const data = await response.json();
    console.log("Response from backend:", data);

    if (response.ok) {
      if (data.length != 0) {
        renderStationCards(data);
        setInterval(() => {
          console.log("Auto-refreshing data...");
          getStatus();

        }, 60000);
      }
      else {
        document.getElementById('output1').textContent = `No details found for train Number: ${trainNumber}`;
        document.getElementById("train-loader").style.display = "none";
      }



    } else {
      document.getElementById('output1').textContent = `Error: ${data.error}`;
    }
  } catch (error) {
    console.error("Error:", error.message);
    document.getElementById("train-loader").style.display = "none";
    document.getElementById('output1').textContent = `Error: ${error.message}`;
  }
}

function renderStationCards(data) {
  const container = document.getElementById('trainStatusContainer');
  container.innerHTML = "";

  document.getElementById("train-loader").style.display = "none";
  document.getElementById("output1").innerText = "";

  let currentStationElement = null;

  data.forEach((station) => {

    const stationCard = document.createElement('div');
    stationCard.className = 'station';


    if (station.current === "true") {
      stationCard.style.backgroundColor = '#A1D6E2';
      currentStationElement = stationCard;
    } else if (station.status === "crossed") {
      stationCard.style.backgroundColor = '#e6e6e6';
    } else {
      stationCard.style.backgroundColor = '#c2f5ba';
    }


    stationCard.innerHTML = `
      <div class="line">
        <img class="circle" src="${station.current === "true"
        ? "https://i.postimg.cc/SKNfYCLn/train.png"
        : station.status === "crossed"
          ? "https://i.postimg.cc/7651m4WD/healthy.png"
          : "https://i.postimg.cc/g0SqVj4N/next-week.png"
      }" alt="status" />
      </div>
      <div class="details">
        <h2>${station.station}</h2>
        <div class="timings">
          <p>Est. Arrival: <span>${station.arr || "N/A"}</span></p>
          <p>Est. Departure: <span>${station.dep || "N/A"}</span></p>
        </div>
        <div class="delay">
          <p>${station.delay ? `Delay: ${station.delay}` : "On Time"}</p>
        </div>
      </div>
    `;


    const delayElement = stationCard.querySelector('.delay p');
    if (station.delay === "") {
      delayElement.style.color = "green";
      stationCard.querySelector("span").style.color = "green";
    } else {
      delayElement.style.color = "red";
    }


    container.appendChild(stationCard);
  });

  if (currentStationElement) {
    currentStationElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

async function searchStation() {
  const stnCode = document.getElementById("at-station").value;
  document.getElementById('trainStationContainer').innerHTML = "";

  try {
    const response = await fetch('https://easy-rail.onrender.com/at-station', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stnCode }),
    });

    const data = await response.json();
    console.log("Response from backend:", data);
    showStationLive(data)


  } catch (error) {
    console.error("Error fetching data:", error);

  }
}

function showStationLive(data) {
  const container = document.getElementById('trainStationContainer');


  data.forEach(train => {
    const trainDiv = document.createElement('div');
    trainDiv.className = 'train-det';

    trainDiv.innerHTML = `
            <h3>${train.trainname} (${train.trainno})</h3>
            <p>${train.source} &#8594 ${train.dest}</p>
            <h2>${train.timeat}</h2>
        `;

    trainDiv.onclick = () => {
      window.location.href = `train-search.html?trainno=${train.trainno}`;
    };

    container.appendChild(trainDiv);
  });
}



function updateDateInput(tabId) {
  const dateInput = document.getElementById('aval-date');
  const today = new Date();
  let selectedDate;

  switch (tabId) {
    case 'date-today':
      selectedDate = today;
      break;
    case 'date-tom':
      selectedDate = new Date(today);
      selectedDate.setDate(today.getDate() + 1);
      break;
    case 'date-after':
      selectedDate = new Date(today);
      selectedDate.setDate(today.getDate() + 2);
      break;
  }


  const formattedDate = selectedDate.toISOString().split('T')[0];
  dateInput.value = formattedDate;
}



try {
  const station_fr = document.getElementById("station-input-from");
  let debounceTimer;
  const debounceDelay = 300;

  station_fr.addEventListener("input", async () => {
    const input = station_fr.value;

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (input.length > 2) {
        getStationFrom(input);
      } else {
        document.getElementById("station-from").style.display = "none";
      }
    }, debounceDelay);
  });
} catch (error) {
  console.log("not on aval page");
}


function getStationFrom(input) {
  const suggestionsBox = document.getElementById("station-from");

  if (input) {
    fetch('stations.json')
      .then(response => response.json())
      .then(data => {


        const stationnaam = data.stations;



        const filteredStations = stationnaam.filter(station =>
          station.stnName.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCode.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCity.toLowerCase().includes(input.toLowerCase())
        );



        if (filteredStations.length === 0) {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = "<div class='no-results'>No results found</div>";
        } else {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = "";
          filteredStations.forEach(station => {
            const suggestionItem = document.createElement("div");
            suggestionItem.classList.add("suggestion-item");
            suggestionItem.textContent = `${station.stnName} (${station.stnCode})`;
            suggestionItem.addEventListener("click", () => {
              document.getElementById("station-input-from").value = `${station.stnName} (${station.stnCode})`;
              sessionStorage.setItem("from", `${station.stnCode}`)
              suggestionsBox.style.display = "none";
              suggestionsBox.innerHTML = "";
            });
            suggestionsBox.appendChild(suggestionItem);
          });
        }
      })
      .catch(error => {
        console.error('Fetch error:', error);
      });
  } else {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
  }

}




try {
  const station_to = document.getElementById("station-input-to");
  let debounceTimer;
  const debounceDelay = 300;

  station_to.addEventListener("input", async () => {
    const input = station_to.value;

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (input.length > 2) {
        getStationTo(input);
      } else {
        document.getElementById("station-to").style.display = "none";
      }
    }, debounceDelay);
  });
} catch (error) {
  console.log("not on aval page");
}


function getStationTo(input) {
  const suggestionsBox = document.getElementById("station-to");

  if (input) {
    fetch('stations.json')
      .then(response => response.json())
      .then(data => {


        const stationnaam = data.stations;



        const filteredStations = stationnaam.filter(station =>
          station.stnName.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCode.toLowerCase().includes(input.toLowerCase()) ||
          station.stnCity.toLowerCase().includes(input.toLowerCase())
        );



        if (filteredStations.length === 0) {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = "<div class='no-results'>No results found</div>";
        } else {
          suggestionsBox.style.display = "block";
          suggestionsBox.innerHTML = "";
          filteredStations.forEach(station => {
            const suggestionItem = document.createElement("div");
            suggestionItem.classList.add("suggestion-item");
            suggestionItem.textContent = `${station.stnName} (${station.stnCode})`;
            suggestionItem.addEventListener("click", () => {
              document.getElementById("station-input-to").value = `${station.stnName} (${station.stnCode})`;
              sessionStorage.setItem("to", `${station.stnCode}`)
              suggestionsBox.style.display = "none";
              suggestionsBox.innerHTML = "";
            });
            suggestionsBox.appendChild(suggestionItem);
          });
        }
      })
      .catch(error => {
        console.error('Fetch error:', error);
      });
  } else {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
  }

}












try {
  const aval_button = document.getElementById("get-aval")
  aval_button.addEventListener("click", async () => {
    const from = sessionStorage.getItem("from")
    const to = sessionStorage.getItem("to")
    const dateString = document.getElementById("aval-date").value;
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const indianFormatDate = `${day}-${month}-${year}`;
    console.log(indianFormatDate);

    const response = await fetch(`https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&addAvailabilityCache=true&excludeMultiTicketAlternates=false&excludeBoostAlternates=false&sortBy=DEFAULT&dateOfJourney=${indianFormatDate}&enableNearby=true&enableTG=true&tGPlan=CTG-3&showTGPrediction=false&tgColor=DEFAULT&showPredictionGlobal=true`);
    const data = await response.json()

    getAvailability(data)

  })

} catch (error) {
  console.error("Error in getting data", error)

}


function getAvailability(data) {
  const container = document.querySelector(".aval-container");
  container.innerHTML =""

  data.data.trainList.forEach((train) => {
    const seatHTML = train.avlClassesSorted
      .map((classType) => {
        const isTatkal = classType.includes("_TQ"); 
        const classKey = isTatkal ? classType.replace("_TQ", "") : classType;
        const classData = isTatkal
          ? train.availabilityCacheTatkal[classKey] || {}
          : train.availabilityCache[classKey] || {}; 

       
        const isUnavailable =
          classData.availabilityDisplayName === "Train Cancelled" ||
          classData.availabilityDisplayName === "Train Departed" ||
          classData.availabilityDisplayName === "Regret" ||
          classData.availabilityDisplayName === "Not Available"
          

        return `
      <div class="seat-aval ${isUnavailable ? "red-bg" : ""}">
          <div class="seat-aval-header">
              <div class="seat-name"><strong>${classType}</strong></div>
              <div class="seat-price"><strong>₹${classData.fare || "---"}</strong></div>
          </div>
          <div class="seat-aval-details  ${isUnavailable ? "red-text" : ""}"><strong>${classData.availabilityDisplayName || "WL --"}</strong></div>
          ${isUnavailable ? `<div class="seat-aval-chance ${isUnavailable ? "red-text" : "" }">No Chance</div>` : `<div class="seat-aval-chance">${classData.prediction || "--%"}</div>`}
          
      </div>`;
      })
      .join("");

    const html = `
    <div class="aval-train">
        <div class="train-header">
            <div class="train-no">${train.trainNumber} - ${train.trainName}</div>
            ${train.hasPantry ? `<div class="pantry"><img src="img/pantry.png" alt="pantry"></div>` : "" }
            
        </div>
        <div class="train-data">
            <div class="train-timings">
                <strong>${train.departureTime} ${train.fromStnCode}</strong> 
                <span>${Math.floor(train.duration / 60)}h ${train.duration % 60}m</span> 
                <strong>${train.arrivalTime} ${train.toStnCode}</strong>
            </div>
            <div class="train-sche-link"><a href="/train-search.html?trainno=${train.trainNumber}">Schedule</a></div>
        </div>
        <div class="seats">
            ${seatHTML}
        </div>
    </div>`;

    container.insertAdjacentHTML("beforeend", html);
  });
}
