// Metro Transit web service definitions at http://svc.metrotransit.org/

'use strict';
/**//*
// Initialize sample trip array for 'home to work' Journey
let trip = initTrip();


const wait1Min = 60000;
// const wait1Min = 15000;
// window.setInterval(update, wait1Min); // update every minute
update();

}*//**/
/////// New Class Code begins here

class Stop {
  constructor(stopId, routes) {
    this.stopId = stopId; // Metro Transit Stop ID
    this.routes = routes; // string array
    this.dep = []; // array of departures
  }
  update() {
    // parse stuff from fetch/promise
    // only for routes
    for (let i=0, j=0; i<webData[this.stopId].length; i++) {
      if (this.routes.includes(webData[this.stopId][i].route)) {
        this.dep[j] = webData[this.stopId][i];
        j++;
      }
    }

  }
  getNextDeparture() {
    return /* time */; // return object of {readableTime, timeInMs}
  }
  getNextDepartureAfterTime(time) {
    // time in ms
    return /* time */;
  }
}

class Leg {
  constructor(beginID, endID, routes, nominalDuration, descr) {
    this.begin = new Stop(beginID, routes);
    this.end = new Stop(endID, routes);
    this.dur = nominalDuration; // low estimate of travel duration in seconds
    this.descr = descr;
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

  getNumTrips() {
    return trips.length;
  }
  uniqueStops() {
    // returns object with key for each unique stop
    let obj = {};
    for (let trip of this.trips) {
      // if (trip.firstLeg.dur != undefined) { // is this leg not blank?
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
}

function initJourney() {
  // eventually there will be a number of journeys defined there
  // The user will press a button to choose a particular journey.
  // Right now, the Home to Work journey is hardcoded.
  let journey = new Journey('Home to Work');
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
        nominalDur: 180,
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
        nominalDur: 400,
        desc : ''
      },
      lastLeg :
      { routes : ['Grn'],    // Blue Line
        beginID: '56043',  // West Bank Station
        endID  : '51424',  // Government Plaza Station
        nominalDur: 180,
        descr : ''
      }
    }
  );
  return journey;
}

let webData; // initialized in promise
let journey = initJourney();
webUpdate(journey.uniqueStops());

function webUpdate (stops) {
  console.log('updating', Date());

  // Fetch/Promise adapted from https://stackoverflow.com/questions/46503558/how-to-use-multiple-xmlhttprequest

  const url = "http://svc.metrotransit.org/NexTrip/";
  const jsonSuffix = "?format=json";

  let stopUrls = Object.keys(stops).map(key => url + key + jsonSuffix);

  Promise.all(stopUrls.map(url => fetch(url).then(resp => resp.text())))
              .then(texts =>
                {
                  storeRouteData(texts, stops),
                  journey.update(),
                  console.log('and the display!');
                }
            );

}

///// end new Class code

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
      // if (arr[stop]['routes'].indexOf(arrivals[j].Route) != -1) { // if arrival is for a route we are using
        arr[stop][j] = {}; // empty object to allow adding keys
        arr[stop][j].actual = departures[j].Actual; // true if actual time based on GPS data
        arr[stop][j].depart = departures[j].DepartureText;
        arr[stop][j].departTime = metroTransitDateToNum(departures[j].DepartureTime);
        arr[stop][j].route = departures[j].Route;
        // k++;
      // }
    }
    i++;
  }
  webData = arr; // update variable with larger scope
}

function putTogetherTrip() {
  for (let i=0; i<trip.length; i++) {
    // for the first leg (i.e., j=0):
    trip[i][0].beginTime = stops[ trip[i][0]['beginID'] ][0]['depart'];
    trip[i][0].endTime = timeAtEndOfLeg(
                         stops[ trip[i][0]['beginID'] ][0]['departTime'],
                         trip[i][0].route,
                         stops[trip[i][0].endID],
                         trip[i][0].nominalDur);
    for (let j=1; j<trip[i].length; j++) {
      trip[i][j].beginTime = getArrAfterTime(trip[i][j-1].endTime,
                             stops[trip[i][j].beginID]);
      trip[i][j].endTime = timeAtEndOfLeg(
                           stops[ trip[i][j]['beginID'] ][j]['departTime'],
                           trip[i][j].route,
                           stops[trip[i][j].endID],
                           trip[i][j].nominalDur);
    }
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
      let time = trip[i][j]['beginTime'];
      console.log(`Next arrival for route ${route} at stop
                  ${stop} is ${time}.`);
                  // ${stop} is ${stops[stop][0]['depart']}.`);
    }
  }
}

function timeAtEndOfLeg(timeAtBeginID, route, arrivalsEndID, nominalDur) {
  // In order to match up different legs of the trip, we must determine when
  // the bus/train that leaves the beginID at a given time will arrive at the
  // endID.
  // We do this by looking for the arrival at endID that is after the arrival
  // time at beginID plus nominalDur.
  // Earliest time to reach endID is
  // +stops[ trip[i][j].beginID ].DepartureTime + trip[i][j].nomDur*1000
  // Find index of arrival with next greater time and return value of
  // stops.stop.depart for stop = trip[i][j+1].beginID
  let nomArrTime = timeAtBeginID + (nominalDur * 1000);
  // for (let i=0; i<arrivalsEndID.length; i++) {
  for (let key in arrivalsEndID) {
    if (arrivalsEndID[key].departTime > nomArrTime
        && route.includes(arrivalsEndID[key].route)) {
      return arrivalsEndID[key].departTime;
    }
  }
  return null;
}

function getArrAfterTime(time, arrivals) {
  // for (let i=0; i<arrivals.length; i++) {
  for (let key in arrivals) {
    if (arrivals[key].departTime > time) {
      return arrivals[key].depart; // in human-readable for display purposes
    }
  }
  return null;
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
