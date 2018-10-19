// Metro Transit web service definitions at http://svc.metrotransit.org/

// 'use strict';
// let xhr = HTTPInit(); // XML HTTP Request object
// let response = null; // response data from web source

// Initialize sample trip array for 'home to work' Journey
let trip = initTrip();

const wait1Min = 60000;
// const wait1Min = 15000;
// window.setInterval(update, wait1Min); // update every minute
update();

function update () {
  // HTTPRequest("http://svc.metrotransit.org/NexTrip/16320?format=json");
  console.log('updating', Date());

  // Fetch/Promise adapted from https://stackoverflow.com/questions/46503558/how-to-use-multiple-xmlhttprequest

  const url = "http://svc.metrotransit.org/NexTrip/";
  const jsonSuffix = "?format=json";
  /*let*/ stops = getUniqueStops();

  let stopUrls = Object.keys(stops).map(key => url + key + jsonSuffix);

  Promise.all(stopUrls.map(url => fetch(url).then(resp => resp.text())))
              .then(texts => storeRouteData(texts, stops));

}

function initTrip() {
// The Trip array would be initialized based on which Journey button the
// user chooses.
  // Trip array: 2-D array
  //     - 1st index: Trip (for each possible sequence of legs)
  //     - 2nd index: Leg (for each Leg to realize the Trip)
  // 	Leg: object with the following keys:
  //     - routes: array with Metro Transit route numbers (e.g., [‘2’, ‘9’]
  //     - Begin stop ID
  //     - End stop ID
  let arr = [];
  let ways = 3; // number of Trips (i.e., sequence of Legs)

  for (let i=0; i<ways; i++) { // init multidimentional array
    arr[i] = [];
  }
  arr[0][0] = { route  : ['7'],     // northbound
                 beginID: '16320',  // 27th Av & 25th St
                 endID  : '19294'  // 4th Av & 3rd St
               }
  arr[1][0] = { route  : ['2', '67'], // westbound
                 beginID: '56703',  // seward towers
                 endID  : '51533'  // Franklin Ave Station
               }
  arr[1][1] = { route  : ['Blue'],    // Blue Line
                 beginID: '51427',  // Franklin Ave Station
                 endID  : '51424'  // Government Plaza Station
               }
  arr[2][0] = { route  : ['2'],    // eastbound
                 beginID: '13261', // seward towers
                 endID  : '13221'  // Wash & Cedar
               }
  arr[2][1] = { route  : ['Grn'],    // Blue Line
                 beginID: '56043',  // West Bank Station
                 endID  : '51424'  // Government Plaza Station
               }
               console.log(arr[1][0]['route']);
  return arr;
}

function getUniqueStops() {
  // Returns object
  // key for each unique stop
  // each key value is empty array
  let obj = {};
  for (let i=0; i<trip.length; i++) {
    for (let j=0; j<trip[i].length; j++) {
        obj[trip[i][j]['beginID']] = {arrivals : [], routes : trip[i][j]['route']};
        obj[trip[i][j]['endID']] = {arrivals : [], routes : trip[i][j]['route']};
    }
  }
  return obj;
}

function storeRouteData(resp, arr) {
  // Take data from fetched responses, parse out and store needed keys.
  //
  // The order of the keys in the arguments and in this routine are the sample
  // because they use object.keys and for.in. Beware of changing implementations
  // that might result in a different ordering. See:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys

  // const storedArrivals = 4; //store first four arrivals for each stop
  let i = 0; // index for resp argument, ordered same as enumerated keys
  for (let stop in arr) {
    let arrivals = JSON.parse(resp[i]); // array of arrivals for a given stop
    for (let j=0, k=0; j<arrivals.length; j++) { // index of individual arrival at stop
      if (arr[stop]['routes'].indexOf(arrivals[j].Route) != -1) { // if arrival is for a route we are using
        arr[stop][k] = {}; // empty object to allow adding keys
        arr[stop][k].actual = arrivals[j].Actual;
        arr[stop][k].depart = arrivals[j].DepartureText;
        arr[stop][k].departTime = arrivals[j].DepartureTime;
        arr[stop][k].route = arrivals[j].Route;
        k++;
      }
    }
    i++;
  }
  displayJourney();
}

function displayJourney() {
  console.log('For this journey from home to work:');
  for (let i=0; i<trip.length; i++) {
    console.log(`Trip ${i}:`);
    for (let j=0; j<trip[i].length; j++) {
      let route = trip[i][j]['route'];
      let stop = trip[i][j]['beginID'];
      console.log(`Next arrival for route ${route} at stop
                  ${stop} is ${stops[stop][0]['depart']}.`);
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
