// Metro Transit web service definitions at http://svc.metrotransit.org/

'use strict';
// Global Variables
let webData; // initialized in promise
let journey;
let startTime;
let refreshUpdate;
const displayInterval = 5000; // milliseconds
const updateInterval = 10 * displayInterval;
let refreshCnt = 0;
const maxRefresh = 8;

// Class definitions
class Stop {
  constructor(stopId, routes) {
    this.stopId = stopId; // Metro Transit Stop ID
    this.routes = routes; // string array
    this.dep = []; // array of departures
  }
  update() {
    for (let i=0, j=0; i<webData[this.stopId].length; i++) {
      if (this.routes.includes(webData[this.stopId][i].route)) {
        this.dep[j] = webData[this.stopId][i];
        j++;
      }
    }
  }
  nextDeparture() {
    return {
      time : this.dep[0].depart,
      timeInMs : this.dep[0].departTime
    }
  }
  nextDepartureAfterTime(time) {
    // time in ms
    if (time == null) {
      return null;
    }
    for (let i=0; i<webData[this.stopId].length; i++) {
      if (webData[this.stopId][i].departTime > time) {
        return {
          time : this.dep[i].depart,
          timeInMs : this.dep[i].departTime
        }
      }
    }
    return {
      time : null,
      timeInMs : null
    };
  }
}

class Leg {
  constructor(beginID, endID, routes, nominalDuration, descr) {
    this.begin = new Stop(beginID, routes);
    this.end = new Stop(endID, routes);
    this.dur = nominalDuration; // low estimate of travel duration in seconds
    this.descr = descr;
  }
  arrivalTime() { // returns estimated arrival time at endID for next departure
                  // from beginID. Subject to some error on multiple-route legs
                  // because the specific route is not checked.
    return this.end.nextDepartureAfterTime(
      this.begin.nextDeparture().timeInMs + this.dur * 1000
    );
  }
  update() {
    this.begin.update();
    this.end.update();
  }
}

class Trip {
  constructor(descr, obj) {
    if (obj.firstLeg !== {}) {
      this.firstLeg = new Leg(
        obj.firstLeg.beginID,
        obj.firstLeg.endID,
        obj.firstLeg.routes,
        obj.firstLeg.nominalDur, ''
      );
    } else {
        this.firstLeg = null;
    }
    if (obj.lastLeg !== {}) {
      this.lastLeg = new Leg(
        obj.lastLeg.beginID,
        obj.lastLeg.endID,
        obj.lastLeg.routes,
        obj.lastLeg.nominalDur, ''
      );
    } else {
      this.lastLeg = null;
    }
    this.descr = descr;
  }
  hasLastLeg() {
    return this.lastLeg.dur !== undefined;
  }
  update() {
    this.firstLeg.update();
    if (this.hasLastLeg()) {
      this.lastLeg.update();
    }
  }
}

class Journey {
  constructor(descr) {
    this.trips = [];
    this.descr = descr;
  }
  addTrip(obj) {
    let trip = new Trip(
      '', // description
      obj
    );
    this.trips.push(trip);
  }
  numTrips() {
    return this.trips.length;
  }
  uniqueStops() {
    // returns object with key for each unique stop
    let obj = {};
    for (let trip of this.trips) {
      obj[trip.firstLeg.begin.stopId] = [];
      obj[trip.firstLeg.end.stopId] = [];
      if (trip.hasLastLeg()) {
        obj[trip.lastLeg.begin.stopId] = [];
        obj[trip.lastLeg.end.stopId] = [];
      }
    }
    return obj;
  }
  update() {
    for (let trip of this.trips) {
      trip.update();
    }
  }
  display() {
    let output = (`Journey ${this.descr}:`);

    for (let i=0, len=this.numTrips(); i<len; i++) {
      // first leg
      let routes = this.trips[i].firstLeg.begin.routes;
      let stop = this.trips[i].firstLeg.begin.stopId;
      let time = this.trips[i].firstLeg.begin.nextDeparture();
      output += '<br>' +
        `Next arrival for route ${routes} at stop ${stop} is ${time.time}.<br>`;
      // last leg
      if (this.trips[i].hasLastLeg()) {
        let routes2 = this.trips[i].lastLeg.begin.routes;
        let stop2 = this.trips[i].lastLeg.begin.stopId;
        let time2 = this.trips[i].lastLeg.begin.nextDepartureAfterTime(
          this.trips[i].firstLeg.arrivalTime().timeInMs
        );
        output +=
          `Next arrival for route ${routes2} at stop ${stop2} is ${time2.time}.<br>`;
      }
    }
    document.getElementById('output').innerHTML = output;
    document.getElementById('countdown').innerHTML = '';
  }
}

// Function definitions
function initJourney(btnId) {
  resetUpdate();
  // Initialize Journey based on which button was pressed
  console.log(btnId);
  switch (btnId) {
    case 'home_to_work':
      journey = new Journey('Home to Work');
      initJourneyHomeToWork();
      break;
    case 'work_to_home':
      journey = new Journey('Work to Home');
      initJourneyWorkToHome();
      break;
    case 'home_to_uptown':
      break;
    case 'uptown_to_home':
      break;
    default:
      console.log('error: default init condition');
  }

  webUpdate(); // initial display
  startTime = new Date();
  refreshCnt = 0;
  refreshUpdate = window.setInterval(secondsSinceStart, displayInterval);
}

function secondsSinceStart() {
  let elapsedTime = ((new Date).getTime() - startTime) / 1000;
  let timeToRefresh = updateInterval/1000 - Math.floor(elapsedTime);
  if  (timeToRefresh < 0.01) {
    if (++refreshCnt > maxRefresh) {
      resetUpdate();
    } else {
      document.getElementById('countdown').innerHTML = `refreshing`;
      startTime = (new Date).getTime();
      webUpdate();
    }
  } else {
    document.getElementById('countdown').innerHTML =
      `${timeToRefresh} secs to refresh`;
  }
}

function resetUpdate() {
  if (refreshUpdate != undefined) {
    window.clearInterval(refreshUpdate);
  }
  document.getElementById('countdown').innerHTML = '';
  document.getElementById('output').innerHTML = '';
}

function initJourneyHomeToWork() {
  journey.addTrip(
    { firstLeg :
      { routes : ['7'],    // northbound
        beginID: '16320',  // 27th Av & 25th St
        endID  : '19294',  // 4th Av & 3rd St
        nominalDur: 600,
        descr : ''
      },
      lastLeg :
      {
      }
    }
  );
  journey.addTrip(
    { firstLeg :
      { routes : ['2', '67'], // westbound
        beginID: '56703',  // seward towers
        endID  : '51533',  // Franklin Ave Station
        nominalDur: 150,
        desc : ''
      },
      lastLeg :
      { routes : ['Blue'],    // Blue Line
        beginID: '51427',  // Franklin Ave Station
        endID  : '51424',  // Government Plaza Station
        nominalDur: 360,
        descr : ''
      }
    }
  );
  journey.addTrip(
    { firstLeg :
      { routes : ['2'],    // eastbound
        beginID: '13261', // seward towers
        endID  : '13221',  // Wash & Cedar
        nominalDur: 300,
        desc : ''
      },
      lastLeg :
      { routes : ['Grn'],    // Blue Line
        beginID: '56043',  // West Bank Station
        endID  : '51424',  // Government Plaza Station
        nominalDur: 240,
        descr : ''
      }
    }
  );
  journey.addTrip(
    { firstLeg :
      { routes : ['Blue'],    // northbound
        beginID: '51427',  // 27th Av & 25th St
        endID  : '51424',  // 4th Av & 3rd St
        nominalDur: 360,
        descr : ''
      },
      lastLeg :
      {
      }
    }
  );
}

function initJourneyWorkToHome() {
  journey.addTrip(
    { firstLeg :
      { routes : ['7'],    // southbound
        beginID: '18011',  // 5th Av S & Wash
        endID  : '16583',  // 27th Av & 24th St
        nominalDur: 600,
        descr : ''
      },
      lastLeg :
      {
      }
    }
  );
  journey.addTrip(
    { firstLeg :
      { routes : ['22'], // southbound
        beginID: '18011',  // 5th Av S & Washington
        endID  : '40467',  // Cedar Av & Franklin Av
        nominalDur: 600,
        desc : ''
      },
      lastLeg :
      { routes : ['2','9','67'], // eastbound
        beginID: '51532',  // Franklin Av Station
        endID  : '56702',  // Seward Towers (not a stop for rt 9...)
        nominalDur: 240,
        descr : ''
      }
    }
  );
  journey.addTrip(
    { firstLeg :
      { routes : ['Blue'],    // southbound
        beginID: '51409', // Government Plaza Station
        endID  : '51412',  // Franklin Av Station
        nominalDur: 400,
        desc : ''
      },
      lastLeg :
      { routes : ['2','9','67'], // eastbound
        beginID: '51532',  // Franklin Av Station
        endID  : '56702',  // Seward Towers (not for rt 9)
        nominalDur: 240,
        descr : ''
      }
    }
  );
  journey.addTrip(
    { firstLeg :
      { routes : ['Grn'],    // eastbound
        beginID: '51409', // Government Plaza Station
        endID  : '56001',  // Westbank Station
        nominalDur: 400,
        desc : ''
      },
      lastLeg :
      { routes : ['2','7'], // west/southbound
        beginID: '42452',  // 3rd St & Cedar Av
        endID  : '16583',  // 27th Av S & 24th St (only for 7)
        nominalDur: 360,
        descr : ''
      }
    }
  );
}

function enterStop() {
  resetUpdate();
  let stop = document.getElementById('route').value;
  if (stop < 10000 || route > 99999) {
    alert('Enter a valid stop');
    return;
  }
  let url = "https://svc.metrotransit.org/NexTrip/" + stop + "?format=json";
  fetch(url).then(resp => resp.text())
            .catch(err => console.log(err))
            .then(text => displayStop(JSON.parse(text)));
}

function displayStop(data) {
  console.log(data);
  let output = '';
  for (let i=0; i<data.length; i++) {
    output += `Route ${data[i].Route}:` + '&nbsp&nbsp&nbsp&nbsp' + data[i].DepartureText + '<br>';
  }
  if (output === '') {
    output = 'No data. Check stop number.'
  }
  output += '(Refresh: press Enter Stop)';
  document.getElementById('output').innerHTML = output;
}

function webUpdate() {
  console.log('updating', Date());

  // Fetch/Promise adapted from https://stackoverflow.com/questions/46503558/how-to-use-multiple-xmlhttprequest

  const url = "https://svc.metrotransit.org/NexTrip/";
  const jsonSuffix = "?format=json";

  let stopUrls = Object.keys(journey.uniqueStops()).map(key => url + key + jsonSuffix);

  Promise.all(stopUrls.map(url => fetch(url).then(resp => resp.text())))
              .then(texts =>
                {
                  storeRouteData(texts, journey.uniqueStops()),
                  journey.update(),
                  journey.display();
                  // checkDateTimeFormat();
                }
              );
}

function storeRouteData(resp, arr) {
  // Take data from fetched responses, parse out and store needed keys.
  //
  // The order of the keys in the arguments and in this routine are the same
  // because they use object.keys and for.in. Beware of changing implementation
  // that might result in a different ordering. See:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys

  let i = 0; // index for resp argument, ordered same as enumerated keys
  for (let stop in arr) {
    let departures = JSON.parse(resp[i]); // array of departures for a given stop
    for (let j=0; j<departures.length; j++) { // index of individual arrival at stop
        arr[stop][j] = {}; // empty object to allow adding keys
        arr[stop][j].actual = departures[j].Actual; // true if actual time based on GPS data
        arr[stop][j].depart = departures[j].DepartureText;
        arr[stop][j].departTime = metroTransitDateToNum(departures[j].DepartureTime);
        arr[stop][j].route = departures[j].Route;
    }
    i++;
  }
  webData = arr; // update variable with larger scope
}

function metroTransitDateToNum(d) {
  // www.metrotransit.org uses date/time format in this form:
  //  \/Date(1539990000000-0500)\
  // since this program uses this field for relative measures, we can extract
  // the inner 13 numerals and return them as a number for comparison with
  // other values obtained in this way. This number is in ms. Even though the
  // last 4 digits are always returned as 0000 (i.e., resolution of 10 seconds)
  // by metrotransit.org in testing, they are included as-is since it is common
  // to express time in ms. This quantity is well below MAX_SAFE_INTEGER.
  // Note that trips spanning DST changeovers (improbable) aren't handled.
  return +d.substring(6, 19);
}

// function checkDateTimeFormat() {
//   // While testing on 10/21/18, times for LRT Blue Line appeared 12 minutes of
//   // from bus times. Two hours later, times between stops were aligned.
//   for (let key in webData) {
//     for (let i in webData[key]) {
//       console.log(
//         key,
//         webData[key][i].depart,
//         (webData[key][i].departTime - 1540435000000) / 60000
//       );
//     }
//   }
// }
