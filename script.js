// Metro Transit web service definitions at http://svc.metrotransit.org/

'use strict';

// Globval Variables
let webData; // initialized in promise
let journey;

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
    for (let i=0; i<webData[this.stopId].length; i++) {
      if (webData[this.stopId][i].departTime > time) {
        return {
          time : this.dep[i].depart,
          timeInMs : this.dep[i].departTime
        }
      }
    }
    return null;
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
  numTrips() {
    return this.trips.length;
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
  display() {
    console.log(`For this journey ${this.descr}:`);

    for (let i=0; i<this.numTrips(); i++) {
      // first leg
      console.log(`Trip ${i}:`);
      let routes = this.trips[i].firstLeg.begin.routes;
      let stop = this.trips[i].firstLeg.begin.stopId;
      let time = this.trips[i].firstLeg.begin.nextDeparture();
      console.log(
        `Next arrival for route ${routes} at stop ${stop} is ${time.time}.`
      );
      // last leg
      if (this.trips[i].hasLastLeg()) {
        let routes = this.trips[i].lastLeg.begin.routes;
        let stop = this.trips[i].lastLeg.begin.stopId;
        let time2 = this.trips[i].lastLeg.begin.nextDepartureAfterTime(
                      time.timeInMs + this.trips[i].firstLeg.dur * 1000);
        console.log(
          `Next arrival for route ${routes} at stop ${stop} is ${time2.time}.`
        );
      }
    }
  }
}

function initJourney(btn_id) {
  // eventually there will be a number of journeys defined there
  // The user will press a button to choose a particular journey.
  // Right now, the Home to Work journey is hardcoded.
  console.log(btn_id);
  switch (btn_id) {
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

  webUpdate();
  const updateInterval = 40000; // milliseconds
  window.setInterval(webUpdate, updateInterval); // update every minute
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
        nominalDur: 240,
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
        nominalDur: 240,
        descr : ''
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

function webUpdate() {
  console.log('updating', Date());

  // Fetch/Promise adapted from https://stackoverflow.com/questions/46503558/how-to-use-multiple-xmlhttprequest

  const url = "http://svc.metrotransit.org/NexTrip/";
  const jsonSuffix = "?format=json";

  let stopUrls = Object.keys(journey.uniqueStops()).map(key => url + key + jsonSuffix);

  Promise.all(stopUrls.map(url => fetch(url).then(resp => resp.text())))
              .then(texts =>
                {
                  storeRouteData(texts, journey.uniqueStops()),
                  journey.update(),
                  journey.display();
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
