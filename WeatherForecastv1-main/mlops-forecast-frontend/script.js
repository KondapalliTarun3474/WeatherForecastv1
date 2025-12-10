// MLOps Forecast Frontend - API Interaction Logic

const API_BASE_URL = 'http://localhost:5000';

// DOM Elements
const loginPage = document.getElementById('login-page');
const forecastPage = document.getElementById('forecast-page');
const loginForm = document.getElementById('login-form');
const forecastForm = document.getElementById('forecast-form');
const loginError = document.getElementById('login-error');
const forecastError = document.getElementById('forecast-error');
const loginBtn = document.getElementById('login-btn');
const forecastBtn = document.getElementById('forecast-btn');
const logoutBtn = document.getElementById('logout-btn');
const versionText = document.getElementById('version-text');
const chartContainer = document.getElementById('chart-container');
const userDisplay = document.getElementById('user-display');
const userAvatar = document.getElementById('user-avatar');

let forecastChart = null;
let currentUser = null;
let map = null;
let heatLayer = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    fetchVersion();
    setupEventListeners();
    initializeMap();   // <-- NEW
});

// Setup event listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    forecastForm.addEventListener('submit', handleForecast);
    logoutBtn.addEventListener('click', handleLogout);
}

// Fetch and display backend version
async function fetchVersion() {
    try {
        const response = await fetch(`${API_BASE_URL}/version`);
        if (response.ok) {
            const data = await response.json();
            versionText.textContent = `v${data.version}`;
        } else {
            versionText.textContent = 'Version unavailable';
        }
    } catch (error) {
        console.error('Failed to fetch version:', error);
        versionText.textContent = 'Offline';
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span>Signing in...';
    hideError(loginError);

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = username;
            showForecastPage();
        } else {
            showError(loginError, data.error || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login failed:', error);
        showError(loginError, 'Connection failed.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

// Handle forecast form submission
async function handleForecast(e) {
    e.preventDefault();

    const lat = parseFloat(document.getElementById('latitude').value);
    const lon = parseFloat(document.getElementById('longitude').value);

    if (lat < -90 || lat > 90) {
        showError(forecastError, 'Latitude must be between -90 and 90');
        return;
    }
    if (lon < -180 || lon > 180) {
        showError(forecastError, 'Longitude must be between -180 and 180');
        return;
    }

    forecastBtn.disabled = true;
    forecastBtn.innerHTML = '<span class="spinner"></span>Fetching forecast...';
    hideError(forecastError);

    try {
        // Forecast call
        const response = await fetch(`${API_BASE_URL}/forecast`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ lat, lon, property: 'T2M' })
        });

        const data = await response.json();

        if (response.ok) {
            displayForecast(data, lat, lon);
            updateHeatmap(lat, lon);   // <-- NEW: fetch heatmap
        } else {
            showError(forecastError, data.error || 'Failed to fetch forecast');
        }
    } catch (error) {
        console.error('Forecast failed:', error);
        showError(forecastError, 'Connection failed.');
    } finally {
        forecastBtn.disabled = false;
        forecastBtn.textContent = 'Get Forecast';
    }
}

// Display forecast data
function displayForecast(data, lat, lon) {
    chartContainer.classList.add('show');
    document.getElementById('location-display').textContent =
        `(${lat.toFixed(4)}, ${lon.toFixed(4)})`;

    const forecasts = data.forecast || data.predictions || data;
    const labels = [];
    const temperatures = [];
    const tableBody = document.getElementById('forecast-tbody');
    tableBody.innerHTML = '';

    if (Array.isArray(forecasts)) {
        forecasts.forEach((item, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index);
            const dateStr = date.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });

            const temp = typeof item === 'object' ? (item.temperature || item.temp || item.value) : item;

            labels.push(`Day ${index + 1}`);
            temperatures.push(parseFloat(temp).toFixed(1));

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Day ${index + 1}</td>
                <td>${dateStr}</td>
                <td class="temp-value">${parseFloat(temp).toFixed(1)}°C</td>
            `;
            tableBody.appendChild(row);
        });
    }

    renderChart(labels, temperatures);
}

// Render Chart.js line chart
function renderChart(labels, data) {
    const ctx = document.getElementById('forecast-chart').getContext('2d');

    if (forecastChart) forecastChart.destroy();

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

// ------------------------------------------------------
// ------------------ HEATMAP CODE (NEW) ----------------
// ------------------------------------------------------

function initializeMap() {
    map = L.map('map').setView([20.0, 78.0], 4);  // Default: India center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    }).addTo(map);
}

async function updateHeatmap(lat, lon) {
    try {
        const response = await fetch(`${API_BASE_URL}/heatmap`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ lat, lon })
        });

        const data = await response.json();

        if (!data.grid) return;

        const heatPoints = data.grid
            .filter(p => p.temp !== null && !isNaN(p.temp))
            .map(p => [p.lat, p.lon, p.temp / 40]); // scaled intensity

        if (heatLayer) heatLayer.remove();

        heatLayer = L.heatLayer(heatPoints, { 
            radius: 25,
            blur: 15,
            maxZoom: 10
        }).addTo(map);

        map.setView([lat, lon], 8);

    } catch (error) {
        console.error("Heatmap error:", error);
    }
}

// ------------------------------------------------------

function showForecastPage() {
    loginPage.classList.remove('active');
    forecastPage.classList.add('active');
    loginForm.reset();
}

function handleLogout() {
    currentUser = null;
    forecastPage.classList.remove('active');
    loginPage.classList.add('active');
    forecastForm.reset();
    chartContainer.classList.remove('show');

    if (forecastChart) {
        forecastChart.destroy();
        forecastChart = null;
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function hideError(element) {
    element.classList.remove('show');
}

