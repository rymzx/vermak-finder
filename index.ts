// This example uses the autocomplete feature of the Google Places API.
// It allows the user to find all hotels in a given place, within a given
// country. It then displays markers for all the hotels returned,
// with on-click details for each hotel.

// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">

let map: google.maps.Map;
let places: google.maps.places.PlacesService;
let infoWindow: google.maps.InfoWindow;
let markers: google.maps.Marker[] = [];
let autocomplete: google.maps.places.Autocomplete;

const countryRestrict = { country: "idn" };
const MARKER_PATH =
  "https://developers.google.com/maps/documentation/javascript/images/marker_green";
const hostnameRegexp = new RegExp("^https?://.+?/");

const countries: Record<
  string,
  { center: google.maps.LatLngLiteral; zoom: number }
> = {
  dpk: {
    center: { lat: -6.402905, lng: 106.778419 },
    zoom: 12.5,
  },
};
function initMap(): void {
  map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
    zoom: countries["dpk"].zoom,
    center: countries["dpk"].center,
    mapTypeControl: false,
    panControl: false,
    zoomControl: false,
    streetViewControl: false,
  });

  infoWindow = new google.maps.InfoWindow({
    content: document.getElementById("info-content") as HTMLElement,
  });

  // Create the autocomplete object and associate it with the UI input control.
  // Restrict the search to Depok, Indonesia, and only show subdistricts.
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById("autocomplete") as HTMLInputElement,
    {
      types: ["geocode"], // Restrict to geocode
      strictBounds: true, // Apply strict bounds
    }
  );

  // Set the bounds to Depok, Indonesia
  const depokBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(-6.4708, 106.7801), // Southwest corner of Depok
    new google.maps.LatLng(-6.3573, 106.9163) // Northeast corner of Depok
  );
  autocomplete.setBounds(depokBounds);

  places = new google.maps.places.PlacesService(map);

  autocomplete.addListener("place_changed", onPlaceChanged);

  // Add a DOM event listener to react when the user selects a country.
  (document.getElementById("country") as HTMLSelectElement).addEventListener(
    "change",
    setAutocompleteCountry
  );
}

// When the user selects a city, get the place details for the city and
// zoom the map in on the city.
function onPlaceChanged() {
  const place = autocomplete.getPlace();

  if (place.geometry && place.geometry.location) {
    map.panTo(place.geometry.location);
    map.setZoom(15);
    search();
  } else {
    (document.getElementById("autocomplete") as HTMLInputElement).placeholder =
      "Masukkan nama kelurahan";
  }
}

// Search for hotels in the selected city, within the viewport of the map.
function search() {
  const search = {
    bounds: map.getBounds() as google.maps.LatLngBounds,
    types: ["tailor"],
    keyword: ["vermak"],
  };

  places.nearbySearch(
    search,
    (
      results: google.maps.places.PlaceResult[] | null,
      status: google.maps.places.PlacesServiceStatus,
      pagination: google.maps.places.PlaceSearchPagination | null
    ) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        clearResults();
        clearMarkers();

        // Create a marker for each hotel found, and
        // assign a letter of the alphabetic to each marker icon.
        for (let i = 0; i < results.length; i++) {
          const markerLetter = String.fromCharCode(
            "A".charCodeAt(0) + (i % 26)
          );
          const markerIcon = MARKER_PATH + markerLetter + ".png";

          // Use marker animation to drop the icons incrementally on the map.
          markers[i] = new google.maps.Marker({
            position: (results[i].geometry as google.maps.places.PlaceGeometry)
              .location,
            animation: google.maps.Animation.DROP,
            icon: markerIcon,
          });
          // If the user clicks a hotel marker, show the details of that hotel
          // in an info window.
          // @ts-ignore TODO refactor to avoid storing on marker
          markers[i].placeResult = results[i];
          google.maps.event.addListener(markers[i], "click", showInfoWindow);
          setTimeout(dropMarker(i), i * 100);
          addResult(results[i], i);
        }
      }
    }
  );
}

function clearMarkers() {
  for (let i = 0; i < markers.length; i++) {
    if (markers[i]) {
      markers[i].setMap(null);
    }
  }

  markers = [];
}

// Set the country restriction based on user input.
// Also center and zoom the map on the given country.
function setAutocompleteCountry() {
  const country = (document.getElementById("country") as HTMLInputElement)
    .value;

  if (country == "all") {
    autocomplete.setComponentRestrictions({ country: [] });
    map.setCenter({ lat: 15, lng: 0 });
    map.setZoom(2);
  } else {
    autocomplete.setComponentRestrictions({ country: country });
    map.setCenter(countries[country].center);
    map.setZoom(countries[country].zoom);
  }

  clearResults();
  clearMarkers();
}

function dropMarker(i) {
  return function () {
    markers[i].setMap(map);
  };
}

function addResult(result, i) {
  const results = document.getElementById("results") as HTMLElement;
  const markerLetter = String.fromCharCode("A".charCodeAt(0) + (i % 26));
  const markerIcon = MARKER_PATH + markerLetter + ".png";

  const tr = document.createElement("tr");

  tr.style.backgroundColor = i % 2 === 0 ? "#F0F0F0" : "#FFFFFF";

  tr.onclick = function () {
    google.maps.event.trigger(markers[i], "click");
  };

  const iconTd = document.createElement("td");
  const nameTd = document.createElement("td");
  const icon = document.createElement("img");

  icon.src = markerIcon;
  icon.setAttribute("class", "placeIcon");
  icon.setAttribute("className", "placeIcon");

  const name = document.createTextNode(result.name);

  iconTd.appendChild(icon);
  nameTd.appendChild(name);
  tr.appendChild(iconTd);
  tr.appendChild(nameTd);
  results.appendChild(tr);
}

function clearResults() {
  const results = document.getElementById("results") as HTMLElement;

  while (results.childNodes[0]) {
    results.removeChild(results.childNodes[0]);
  }
}

// Get the place details for a hotel. Show the information in an info window,
// anchored on the marker for the hotel that the user selected.
function showInfoWindow() {
  // @ts-ignore
  const marker = this;

  places.getDetails(
    { placeId: marker.placeResult.place_id },
    (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        return;
      }

      infoWindow.open(map, marker);
      buildIWContent(place);
    }
  );
}

// Load the place information into the HTML elements used by the info window.
function buildIWContent(place) {
  (document.getElementById("iw-icon") as HTMLElement).innerHTML =
    '<img class="hotelIcon" ' + 'src="' + place.icon + '"/>';
  (document.getElementById("iw-url") as HTMLElement).innerHTML =
    '<b><a href="' + place.url + '">' + place.name + "</a></b>";
  (document.getElementById("iw-address") as HTMLElement).textContent =
    place.vicinity;

  if (place.formatted_phone_number) {
    (document.getElementById("iw-phone-row") as HTMLElement).style.display = "";
    (document.getElementById("iw-phone") as HTMLElement).textContent =
      place.formatted_phone_number;
  } else {
    (document.getElementById("iw-phone-row") as HTMLElement).style.display =
      "none";
  }

  // Assign a five-star rating to the hotel, using a black star ('&#10029;')
  // to indicate the rating the hotel has earned, and a white star ('&#10025;')
  // for the rating points not achieved.
  if (place.rating) {
    let ratingHtml = "";

    for (let i = 0; i < 5; i++) {
      if (place.rating < i + 0.5) {
        ratingHtml += "&#10025;";
      } else {
        ratingHtml += "&#10029;";
      }

      (document.getElementById("iw-rating-row") as HTMLElement).style.display =
        "";
      (document.getElementById("iw-rating") as HTMLElement).innerHTML =
        ratingHtml;
    }
  } else {
    (document.getElementById("iw-rating-row") as HTMLElement).style.display =
      "none";
  }

  // The regexp isolates the first part of the URL (domain plus subdomain)
  // to give a short URL for displaying in the info window.
  if (place.website) {
    let fullUrl = place.website;
    let website = String(hostnameRegexp.exec(place.website));

    if (!website) {
      website = "http://" + place.website + "/";
      fullUrl = website;
    }

    (document.getElementById("iw-website-row") as HTMLElement).style.display =
      "";
    (document.getElementById("iw-website") as HTMLElement).textContent =
      website;
  } else {
    (document.getElementById("iw-website-row") as HTMLElement).style.display =
      "none";
  }
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
