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
  display(verbose = false) {
    let output = `Journey ${this.descr}:<br/>`; // displays Journey and perhaps verbose output
    let diagram = ''; // HTML for diagrams representing Trips in the Journey
    // this breaks encapsulation. Should be refactored so that the Trip
    // and/or Leg objects calculate and return firstLeg, lastLeg, and their HTML
    let firstLeg = {};
    let lastLeg = {};
    for (let trip of this.trips) {
      firstLeg = {
        routes: trip.firstLeg.begin.routes,
        stop: trip.firstLeg.begin.stopId,
        time: trip.firstLeg.begin.nextDeparture(),
      }
      lastLeg = (trip.hasLastLeg() &&
        {
          routes: trip.lastLeg.begin.routes,
          stop: trip.lastLeg.begin.stopId,
          time: trip.lastLeg.begin.nextDepartureAfterTime(
                  trip.firstLeg.arrivalTime().timeInMs
                ),
        }
      );
      if (verbose) {
        output +=
          this.stringVerbose(firstLeg)
          + this.stringVerbose(lastLeg) +'<br/>';
      } else {
        diagram += this.diagramHTML(firstLeg, lastLeg);
      }
    }
    this.outputToDom('output', output);
    this.outputToDom('diagram', diagram);
  }
  stringVerbose(leg) {
    return leg ? `Next arrival for route ${leg.routes} at stop ${leg.stop} is ${leg.time.time}.<br>` : '';
  }
  diagramHTML(firstLeg, lastLeg) {
    return `
          <div class="timeline_out">
            <div class="spacer">x</div>
            <span class="blankTime">${firstLeg.time.time}</span>
            <div class="route_div">${firstLeg.routes}</div>
            ${lastLeg ?
            `<span class="blankTime">${lastLeg.time.time}</span>
            <div class="route_div">${lastLeg.routes}</div>` : ''
            }
          </div>
          <div class="timeline_out">
            <button class="dropButton">D</button>
            <span id="timeLeg1" class="legTime">${firstLeg.time.time}</span>
            <div class="spcr_div" id="spcrLeg1"></div>
            ${lastLeg ?
            `<span id="timeLeg1" class="legTime">${lastLeg.time.time}</span>
            <div class="spcr_div" id="spcrLeg2"></div>` : ''
            }
          </div>
          <hr/>`;
  }
  outputToDom(target, output) {
    document.getElementById(target).innerHTML = output;
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
  document.getElementById('diagram').innerHTML = '';
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
        beginID: '51427',  // Franklin Ave Station
        endID  : '51424',  // Government Plaza Station
        nominalDur: 360,
        descr : ''
      },
      lastLeg :
      {
      }
    }
  );
  journey.addTrip(
    {
      firstLeg:
      {
        routes: ['9'],    // northbound
        beginID: '17603',  // 27th Av & 25th St
        endID: '51533',  // Franklin Ave Station
        nominalDur: 280,
        descr: ''
      },
      lastLeg:
      {
        routes: ['Blue'],    // northbound
        beginID: '51427',  // 27th Av & 25th St
        endID: '51424',  // 4th Av & 3rd St
        nominalDur: 360,
        descr: ''
      },
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
  let output = '';
  for (let i=0; i<Math.min(10, data.length); i++) {
    output += `Route ${data[i].Route}:` + '&nbsp&nbsp&nbsp&nbsp' + data[i].DepartureText + '<br>';
  }
  if (output === '') {
    output = 'No data. Check stop number.'
  }
  document.getElementById('countdown').innerHTML = '(Refresh: press Check Stop)';
  document.getElementById('output').innerHTML = output;
}

function webUpdate() {
  console.log('updating', Date());

  const url = "https://svc.metrotransit.org/NexTrip/";
  const jsonSuffix = "?format=json";

  const stopUrls = Object.keys(journey.uniqueStops()).map(key => url + key + jsonSuffix);

  Promise.all(stopUrls.map(url => fetch(url)
      .then(resp => resp.text())))
      .then(texts =>
        {
          storeRouteData(texts, journey.uniqueStops()),
          journey.update(),
          journey.display();
          // checkDateTimeFormat(); // detect potential misalignment of bus and lrt timestamps
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
