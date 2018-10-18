// Metro Transit web service definitions at http://svc.metrotransit.org/

// 'use strict';
// let xhr = HTTPInit(); // XML HTTP Request object
// let response = null; // response data from web source

const wait1Min = 60000;
// const wait1Min = 15000;
// window.setInterval(update, wait1Min); // update every minute
update();

function update () {
  // HTTPRequest("http://svc.metrotransit.org/NexTrip/16320?format=json");
  console.log('updating', Date());

  ////
  // adapted from https://stackoverflow.com/questions/46503558/how-to-use-multiple-xmlhttprequest

  const url = "http://svc.metrotransit.org/NexTrip/";
  const jsonSuffix = "?format=json";
  // let stops = [
  stops = { stopIDs: [
               '56703',  // Seward towers
               '51533',  // Franklin Ave Station
               '51427',  // Franklin Ave Station
               '51424']  // Government Plaza Station
          }

  let stopUrls = stops.stopIDs.map(s => url + s + jsonSuffix);

  Promise.all(stopUrls.map(url => fetch(url).then(resp => resp.text())))
              // .then(texts => console.log(JSON.parse(texts[0])));
              // .then(texts => console.log(texts));
              .then(texts => storeRouteData(texts, stops));
              // get these keys: DepartureText: "8 Min",
              //                 DepartureTime: "/Date(1539802920000-0500)/"
              //                 Route: "2"
  ////
}

function storeRouteData(resp, arr) {
  const storedArrivals = 4; //store first four arrivals for each stop
  for (let i=0; i<resp.length; i++) { // each index represents an HTML response
    arr[String(arr.stopIDs[i])] = [];
    for (let j=0; j<storedArrivals; j++) { // index of individual arrival at stop
      let temp = JSON.parse(resp[i])[j];
      arr[String(arr.stopIDs[i])][j] = {}; // empty object to allow adding keys
      arr[String(arr.stopIDs[i])][j].actual = temp.Actual;
      arr[String(arr.stopIDs[i])][j].depart = temp.DepartureText;
      arr[String(arr.stopIDs[i])][j].departTime = temp.DepartureTime;
      arr[String(arr.stopIDs[i])][j].route = temp.Route;
    }
  }
}

// function display(e) {
//     if (xhr.readyState == 4) {
//       if (xhr.status == 200) {
//         response =xhr.response[0].DepartureText;
//         console.log(response);
//       } else {
//         console.log('Request status error', xhr.status);
//       }
//     } else {
//       console.log('Ready state =', xhr.readyState);
//     }
// }
//
// function HTTPInit() {
//   let xhr = new XMLHttpRequest();
//   xhr.responseType = "json";
//   xhr.onreadystatechange = display;
//   return xhr;
// }
//
// function HTTPRequest(uri) {
//   xhr.open('GET', uri, true);
//   xhr.send();
// }

// Terminology:
//  journey: set of beginning and ending point (e.g., home to work)
//  trip: possible sequence of legs to accomplish route
//  leg: individual bus route
//
// For each Journey (e.g., home to work), there are more than one sequence of Legs (Trip) that can accomplish the Journey.
//
// User chooses from list of Journeys. That will initialize a Trip array with the sequence of legs.
//
// Trip array: with length equal to number of legs
// 	Leg: object with the following keys:
//     - routes: array with Metro Transit route numbers (e.g., [‘2’, ‘9’]
//     - Begin stop ID
//     - End stop ID
//
// Then, make stops array from Trip array. This will enumerate all unique stop IDs from Trip array.
//
// Stops array: array of all unique stops from Begin stop ID and End stop ID of trip array. Each array element ID is an object with keys stop ID (string) and routes
//
// Responses: from JSON returned from Metro Transit for each element of Stops array. Get following keys:
// - Actual
// - Departure Text
// - Departure Time
// - Route
//
// For first leg of Trip array:
// - What is the set of the next 4 bus arrivals at Begin stop ID for this route?
// - When will each of these reach the End stop ID? (This may require an estimate of how fast each can travel. Maybe this could estimated overall for this application as ‘next arrival > 5 minutes later)
// For subsequent legs of Trip array:
// - What is the set of the next 4 bus arrivals at Begin stop ID  for this route that are after the times for the End stop ID of the previous leg?
// - When will each of these reach the End stop ID?
//
//

// Data structure values for home to work
/*let journey;
let trip;
trip[0][0] = { route  : [7],     // northbound
               beginID: 16320,  // 27th Av & 25th St
               endID  : 19294  // 4th Av & 3rd St
             }
trip[1][0] = { route  : [2, 67], // westbound
               beginID: 56703,  // seward towers
               endID  : 51533  // Franklin Ave Station
             }
trip[1][1] = { route  : [55],    // Blue Line
               beginID: 51427,  // Franklin Ave Station
               endID  : 51424  // Government Plaza Station
             }

// Work to home can include Green Line to 2/7
*/
