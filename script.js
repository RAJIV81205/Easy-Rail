document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname;
  const navLinks = document.querySelectorAll(".navbar .box a");
  fetchTrainDetails();
  sessionStorage.removeItem("selectedTrainNumber");

  navLinks.forEach(link => {
    const linkText = link.textContent.trim();
    const linkHref = link.getAttribute("href");



    if (currentPage === linkHref || linkHref === "#") {
      link.parentElement.classList.add("active-box");

    } else {
      link.parentElement.classList.remove("active-box");
    }
  });
});


const hamburger = document.getElementById('hamburger');
const navbar = document.getElementById('navbar');

hamburger.addEventListener('click', () => {
  navbar.classList.toggle('active');
});





async function fetchTrainDetails() {
  const trainNumber = document.getElementById("train-number").value.trim() || sessionStorage.getItem("selectedTrainNumber");
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
        .map((bit, index) => (bit === "1" ? `${weekdays[index]}`: "_"))
        .join(" ");



      const details = [
        { field: "Train Number", value: data.train_no },
        { field: "Train Name", value: data.train_name },
        { field: "Source", value: `${data.from_stn_name} (${data.from_stn_code})` },
        { field: "Destination", value: `${data.to_stn_name} (${data.to_stn_code})` },
        { field: "Departure", value: data.from_time },
        { field: "Arrival", value: data.to_time },
        { field: "Travel Time", value: data.travel_time },
        { field: "Running Days", value: `${runningDaysFormatted}`},
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










function searchStationFrom() {
  input = document.getElementById("from").value;
  if (input.length < 2) {
    const suggestionsBox = document.getElementById("suggestions-from");
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
    return;
  }
  filterStationFrom(input);
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














function searchStationTo() {
  input = document.getElementById("to").value;
  if (input.length < 2) {
    const suggestionsBox = document.getElementById("suggestions-to");
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
    return;
  }
  filterStationTo(input);
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

function parseTrainData(data) {
  try {
    const arr = [];
    const rawData = data.split("~~~~~~~~").filter((el) => el.trim() !== ""); // Filter valid data
    console.log("Raw Data:", rawData);

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

      console.log("Train Data:", trainData);
      console.log("Train Data 2:", trainData2);

      if (trainData.length === 2) {
        const details = trainData[1].split("~").filter((el) => el.trim() !== "");
        const details2 = trainData2[0]
          ? trainData2[0].split("~").filter((el) => el.trim() !== "")
          : []; // Handle empty trainData2 safely

        console.log("Details:", details);
        console.log("Details 2:", details2);

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

  var selectedDate = document.getElementById("date").value;
  
  const selectedDayIndex = getDayIndex(selectedDate); // Get the day index (0 = Monday)
  var selectedDate = new Date(selectedDate).toLocaleDateString();


  let currentDate = new Date().toLocaleDateString();;
  



  if (selectedDate<currentDate){
    alert("Please input right date")
    return;
  }

  console.log(currentDate)
  console.log(selectedDate)

  if (trains.length === 0) {
    resultContainer.innerHTML = "<p>No trains found for the selected route.</p>";
    return;
  }

  resultContainer.innerHTML = `<h1>List of Trains from ${from} to ${to}.</h1>`;
  trains.forEach(train => {
    // Filter trains by running days
    if (train.running_days[selectedDayIndex] !== "1") return; // Skip if train doesn't run today

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
        <a href="train-search.html" class="timetable-link" id="timeTableLink" data-train-number="${train.train_no}">Time Table</a>
      </div>
    `;

    resultContainer.appendChild(trainItem);

    const timeTableLinks = document.querySelectorAll(".timetable-link");

    timeTableLinks.forEach(link => {
      link.addEventListener("click", function () {
        const trainNumber = link.dataset.trainNumber; // Access train number from the data attribute
        console.log(trainNumber);
        sessionStorage.setItem("selectedTrainNumber", trainNumber);

      });
    });


  });
}






