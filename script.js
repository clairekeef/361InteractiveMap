var map
var minNoise
var maxNoise

const mapTitle = document.createElement('div')
mapTitle.className = 'map-title'
mapTitle.innerHTML = "Map of Noise Levels at Big Ten and SEC Football Stadiums"
document.getElementById('map').appendChild(mapTitle)

// main.js
map = L.map('map').setView([39.828175, -98.5795], 4)
let fixedCenter = [39.828175, -98.5795]


// mapbox://styles/clairekeef/cm8z89nv5000v01rudlafbm4e
// pk.eyJ1IjoiY2xhaXJla2VlZiIsImEiOiJjbTh5cGFub3AwM2tnMnRxMGx0N3BrcmVvIn0.SgbUJgPMxq5CQT8wrLX8BA

L.tileLayer('https://api.mapbox.com/styles/v1/clairekeef/cm8z89nv5000v01rudlafbm4e/tiles/512/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2xhaXJla2VlZiIsImEiOiJjbTh5cGFub3AwM2tnMnRxMGx0N3BrcmVvIn0.SgbUJgPMxq5CQT8wrLX8BA', {
    attribution: '© Claire Keef',
    tileSize: 512,
    zoomOffset: -1,
    minZoom: 4,
    maxZoom: 8,
    maxBoundsViscosity: 1.0,

}).addTo(map)


// Lock pan at zoom level 4, but allow panning at higher zooms
map.on('zoomend', function () {
    const currentZoom = map.getZoom()

    if (currentZoom === 4) {
        map.panTo(fixedCenter, { animate: false })
        map.dragging.disable()
    } else {
        map.dragging.enable()
    }
})

// Always snap back to center at zoom level 4
 map.on('moveend', function () {
    if (map.getZoom() === 4) {
        map.panTo(fixedCenter, { animate: false })
    }
})


function createPropSymbols(data) {
    var noiseAttribute = "noise"

    L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            //Step 5: For each feature, determine its value for the selected attribute
            var noiseValue = Number(feature.properties[noiseAttribute])

            var fillColor = feature.properties.type === "estimated" ? "#FFA500" : "#0077BE" // orange for estimated, blue for measured


            //create marker options
            var geojsonMarkerOptions = {
                fillColor: fillColor,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
            }

            geojsonMarkerOptions.radius = 5 + 15 * (noiseValue - minNoise) / (maxNoise - minNoise)


            var marker = L.circleMarker(latlng, geojsonMarkerOptions)

            var popupContent = "" +
                "<p><b>Team:</b> " + feature.properties.team +
                "</p>" +
                "<p><b>Stadium:</b> " + feature.properties.stadium +
                "</p>" +
                "<p><b>Capacity:</b> " + feature.properties.capacity +
                "</p>" +
                "<p><b>Noise:</b> " + noiseValue +
                "</p>" +
                "<p><b>Type:</b> " + feature.properties.type +
                "</p>"

            marker.bindPopup(popupContent)

            //examine the attribute value to check that it is correct
            console.log(feature.properties, noiseValue)

            //create circle markers
            return marker
        }
    }).addTo(map)


}

function createLegend(min, max) {
    const legend = L.control({ position: 'bottomright' })

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'legend')
        const grades = [min, (min + max) / 2, max]
        const colors = {
            estimated: "#FFA500",
            measured: "#0077BE"
        }

        let html = `
            <h4>Noise Legend</h4>
            <div class="legend-section">
                <div class="legend-subtitle">Data Type:</div>
        `
        for (let key in colors) {
            html += `
                <div class="legend-item">
                    <span class="legend-color" style="background:${colors[key]}"></span>
                    <span class="legend-label">${key}</span>
                </div>
            `
        }

        html += `<div class="legend-subtitle">Circle Size = Noise Level</div>`

        grades.forEach(g => {
            const radius = 5 + 15 * (g - min) / (max - min || 1)
            html += `
                <div class="legend-circle-item">
                    <svg height="${radius * 2}" width="${radius * 2}">
                        <circle cx="${radius}" cy="${radius}" r="${radius}" stroke="#000" stroke-width="1" fill="gray" fill-opacity="0.5" />
                    </svg>
                    <span>${g.toFixed(1)}</span>
                </div>
            `
        })

        html += `</div>` // end .legend-section
        div.innerHTML = html
        return div
    }

    legend.addTo(map)
}

function calculateNoiseRange(data) {
    const values = data.features
        .map(f => Number(f.properties.noise))
        .filter(v => !isNaN(v))
    return {
        min: Math.min(...values),
        max: Math.max(...values)
    }
}

fetch('db.geo.json')
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok')
        return response.json()
    })
    .then(data => {
        const {min, max} = calculateNoiseRange(data)
        minNoise = min
        maxNoise = max
        createLegend(minNoise, maxNoise)
        console.log("Minimum noise level:", minNoise)
        createPropSymbols(data)
    })
    .catch(error => {
        console.error('Error loading GeoJSON data:', error)
    })