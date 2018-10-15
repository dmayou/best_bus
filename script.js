// Metro Transit web service definitions at http://svc.metrotransit.org/

let xhr = null; // future HTTP request
let response = null; // response data from web source

window.setInterval(update, 60000); // update every minute

function update () {
  HTTPInitRequest("http://svc.metrotransit.org/NexTrip/16320?format=json");
  console.log('updating', Date());
}

function display(e) {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        response =xhr.response[0].DepartureText;
        console.log(response);
      } else {
        console.log('Request status error', xhr.status);
      }
    } else {
      console.log('Ready state =', xhr.readyState);
    }
}

function HTTPInitRequest(uri) {
  xhr = new XMLHttpRequest();
  xhr.responseType = "json";
  xhr.open('GET', uri, true);
  xhr.send();

  xhr.onreadystatechange = display;
}
