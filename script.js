document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname; // Get the current page filename
  const navLinks = document.querySelectorAll(".navbar .box a");

  navLinks.forEach(link => {
    const linkText = link.textContent.trim(); // Get the text inside the anchor tag
    const linkHref = link.getAttribute("href");

    // Match the text or href with the current page
    if (currentPage===linkHref || linkHref === "#") {
      link.parentElement.classList.add("active-box"); // Add class to the parent div for styling
    } else {
      link.parentElement.classList.remove("active-box"); // Ensure others are not active
    }
  });
});


const hamburger = document.getElementById('hamburger');
const navbar = document.getElementById('navbar');

hamburger.addEventListener('click', () => {
    navbar.classList.toggle('active');
});





async function fetchTrainDetails() {
  const trainNumber = document.getElementById("train-number").value.trim();
  const trainTable = document.getElementById("train-table");
  const trainTableBody = document.getElementById("train-table-body");
  const trainScheduleBody = document.getElementById('train-schedule');
  trainScheduleBody.innerHTML = "";
  document.getElementById("schedule-container").style.display = "none";


  // Hide the table initially
  trainTable.style.display = "none";

  if (!trainNumber) {
    alert("Please enter a valid train number!");
    return;
  }

  try {
    // Fetch train details from the API
    const response = await fetch(
      `https://erail.in/rail/getTrains.aspx?TrainNo=${trainNumber}&DataSource=0&Language=0&Cache=true`
    );
    const rawData = await response.text();
    

    // Process the raw data into readable format
    const trainInfo = CheckTrain(rawData);

    if (trainInfo.success) {
      const data = trainInfo.data;

      // Clear the table body
      trainTableBody.innerHTML = "";

      // Add rows for train details
      const details = [
        { field: "Train Number", value: data.train_no },
        { field: "Train Name", value: data.train_name },
        { field: "Source", value: `${data.from_stn_name} (${data.from_stn_code})` },
        { field: "Destination", value: `${data.to_stn_name} (${data.to_stn_code})` },
        { field: "Departure", value: data.from_time },
        { field: "Arrival", value: data.to_time },
        { field: "Travel Time", value: data.travel_time },
        { field: "Running Days", value: data.running_days },
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

      // Show the table
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

// Function to process raw train data from the API
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
    // Split the input string into individual train stoppages
    let data = string.split("~^");

    // Map each stoppage to a structured object
    let arr = data.map((item) => {
      let details = item.split("~").filter((el) => el !== ""); // Remove empty elements
      return {
        source_stn_name: details[2],  // Station name
        source_stn_code: details[1], // Station code
        arrive: details[3].replace(".", ":"),          // Arrival time
        depart: details[4].replace(".", ":"),          // Departure time
        distance: details[6],        // Distance covered
        day: details[7],             // Day of travel
        zone: details[9],            // Railway zone
      };
    });

    // Return the result with metadata
    return {
      success: true,
      time_stamp: Date.now(),
      data: arr,
    };
  } catch (err) {
    // Handle errors gracefully
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
       

        const stationnaam = data.stations; // Access the stations array
        

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
            suggestionItem.textContent = `${station.stnName} (${station.stnCode}) - ${station.stnCity}`;
            suggestionItem.addEventListener("click", () => {
              document.getElementById("from").value = station.stnCode; // Set input value
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
        

        const stationnaam = data.stations; // Access the stations array
       

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
            suggestionItem.textContent = `${station.stnName} (${station.stnCode}) - ${station.stnCity}`;
            suggestionItem.addEventListener("click", () => {
              document.getElementById("to").value = station.stnCode; // Set input value
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











document.getElementById("main-search").addEventListener("click", function () {
  const from = document.getElementById("from").value.toLowerCase().trim();
  const to = document.getElementById("to").value.toLowerCase().trim();

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
    const retval = {};
    const arr = [];
    const rawData = data.split("~~~~~~~~");

    // Check for error messages
    if (rawData[0].includes("No direct trains found")) {
      return {
        success: false,
        time_stamp: Date.now(),
        data: "No direct trains found between the selected stations."
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
        data: rawData[0].replace(/~/g, "")
      };
    }

    // Filter valid data and parse trains
    const filteredData = rawData.filter(el => el.trim() !== "");
    for (let i = 0; i < filteredData.length; i++) {
      const trainData = filteredData[i].split("~^");

      if (trainData.length === 2) {
        const details = trainData[1].split("~").filter(el => el.trim() !== "");
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
            from_time: details[10],
            to_time: details[11],
            travel_time: details[12],
            running_days: details[13]
          });
        }
      }
    }

    return {
      success: true,
      time_stamp: Date.now(),
      data: arr
    };
  } catch (err) {
    console.error("Parsing error:", err);
    return {
      success: false,
      time_stamp: Date.now(),
      data: "An error occurred while processing train data."
    };
  }
}

function displayTrains(trains) {
  const resultContainer = document.getElementById("train-results");
  resultContainer.innerHTML = ""; // Clear previous results

  if (trains.length === 0) {
    resultContainer.innerHTML = "<p>No trains found for the selected route.</p>";
    return;
  }

  trains.forEach(train => {
    const trainItem = document.createElement("div");
    trainItem.classList.add("train-item");
    trainItem.innerHTML = `
      <p><strong>${train.train_name} (${train.train_no})</strong></p>
      <p>From: ${train.from_stn_name} (${train.from_stn_code}) at ${train.from_time}</p>
      <p>To: ${train.to_stn_name} (${train.to_stn_code}) at ${train.to_time}</p>
      <p>Travel Time: ${train.travel_time}</p>
      <p>Running Days: ${train.running_days}</p>
    `;
    resultContainer.appendChild(trainItem);
  });
}

