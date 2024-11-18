document.addEventListener("DOMContentLoaded", () => {
  const currentPage = "https://easy-rail.netlify.app/"+window.location.pathname.split("/").pop()+".html"; // Get the current page filename
  const navLinks = document.querySelectorAll(".navbar .box a");

  navLinks.forEach(link => {
    const linkText = link.textContent.trim(); // Get the text inside the anchor tag
    const linkHref = link.getAttribute("href");

    // Match the text or href with the current page
    if (currentPage === linkHref || linkHref === "#") {
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


