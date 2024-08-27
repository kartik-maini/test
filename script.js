let map;
let marker;
let geocoder;
let directionsRenderer;
let directionsService;
let infowindow;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: { lat: 30.2460, lng: 75.8425 },
        mapTypeControl: false,
    });

    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsService = new google.maps.DirectionsService();
    directionsRenderer.setMap(map);

    infowindow = new google.maps.InfoWindow();
    geocoder = new google.maps.Geocoder();

    document.getElementById("directions-btn").addEventListener("click", () => {
        calculateAndDisplayRoute();
    });

    document.getElementById("clear-btn").addEventListener("click", () => {
        clear();
    });

    map.addListener("click", (e) => {
        geocode({ location: e.latLng });
    });

    marker = new google.maps.Marker({
        map,
        position: { lat: 30.2460, lng: 75.8425 },
        title: "Default Location",
    });

    setInterval(updateMapCenter, 2000);
}

function clear() {
    if (marker) {
        marker.setMap(null);
    }
    directionsRenderer.setMap(null);
    document.getElementById("response-container").style.display = "none";
}

function geocode(request) {
    clear();
    geocoder.geocode(request).then((result) => {
        const { results } = result;
        if (results.length > 0) {
            map.setCenter(results[0].geometry.location);
            marker = new google.maps.Marker({
                map,
                position: results[0].geometry.location,
                title: "Destination",
            });
            marker.setMap(map);
        }
    }).catch((e) => {
        alert("Geocode was not successful for the following reason: " + e);
    });
}

function calculateAndDisplayRoute() {
    const destination = document.getElementById("address").value;

    fetch('/gps')
        .then(response => response.json())
        .then(data => {
            if (data && data.lat && data.lng) {
                const originLocation = new google.maps.LatLng(data.lat, data.lng);

                geocoder.geocode({ address: destination }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK) {
                        const destinationLocation = results[0].geometry.location;

                        directionsService.route({
                            origin: originLocation,
                            destination: destinationLocation,
                            travelMode: google.maps.TravelMode[document.getElementById("mode").value],
                        }).then((response) => {
                            directionsRenderer.setDirections(response);
                            displaySteps(response);
                            saveStepsToTextFile(response);  // Save directions to file
                        }).catch((e) => window.alert("Directions request failed due to " + e));
                    } else {
                        alert("Geocode was not successful for the following reason: " + status);
                    }
                });
            }
        })
        .catch(error => console.error('Error getting GPS location:', error));
}

function displaySteps(directionResult) {
    const steps = directionResult.routes[0].legs[0].steps;
    const responseContainer = document.getElementById("response-container");
    const responseText = document.getElementById("response");
    responseText.innerHTML = "";

    steps.forEach((step, index) => {
        responseText.innerHTML += `<p>${index + 1}. ${step.instructions}</p>`;
    });

    responseContainer.style.display = "block";
}

function saveStepsToTextFile(response) {
    const directions = response.routes[0].legs[0];
    let stepsText = "Directions:\n";
    directions.steps.forEach((step, index) => {
        stepsText += `${index + 1}. ${step.instructions.replace(/<[^>]*>?/gm, '')}\n`;
    });
    const blob = new Blob([stepsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'directions.txt';
    a.click();
    URL.revokeObjectURL(url);
}

function updateMapCenter() {
    fetch('https://localhost:8000/gps')
        .then(response => response.json())
        .then(data => {
            if (data && data.lat && data.lng) {
                const newLatLng = new google.maps.LatLng(data.lat, data.lng);
                map.setCenter(newLatLng);
                marker.setPosition(newLatLng);
            }
        })
        .catch(error => console.error('Error updating map center:', error));
}
