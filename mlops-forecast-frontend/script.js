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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    fetchVersion();
    setupEventListeners();
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

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span>Signing in...';
    hideError(loginError);

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        showError(loginError, 'Connection failed. Please try again.');
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

    // Validate coordinates
    if (lat < -90 || lat > 90) {
        showError(forecastError, 'Latitude must be between -90 and 90');
        return;
    }
    if (lon < -180 || lon > 180) {
        showError(forecastError, 'Longitude must be between -180 and 180');
        return;
    }

    // Show loading state
    forecastBtn.disabled = true;
    forecastBtn.innerHTML = '<span class="spinner"></span>Fetching forecast...';
    hideError(forecastError);

    try {
        const response = await fetch(`${API_BASE_URL}/forecast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lat, lon, property: 'T2M' })
        });

        const data = await response.json();

        if (response.ok) {
            displayForecast(data, lat, lon);
        } else {
            showError(forecastError, data.error || 'Failed to fetch forecast');
        }
    } catch (error) {
        console.error('Forecast failed:', error);
        showError(forecastError, 'Connection failed. Please try again.');
    } finally {
        forecastBtn.disabled = false;
        forecastBtn.textContent = 'Get Forecast';
    }
}

// Display forecast data
function displayForecast(data, lat, lon) {
    chartContainer.classList.add('show');

    // Update location display
    document.getElementById('location-display').textContent = `(${lat.toFixed(4)}, ${lon.toFixed(4)})`;

    // Prepare data for chart and table
    const forecasts = data.forecast || data.predictions || data;
    const labels = [];
    const temperatures = [];
    const tableBody = document.getElementById('forecast-tbody');
    tableBody.innerHTML = '';

    // Handle different response formats
    if (Array.isArray(forecasts)) {
        forecasts.forEach((item, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            const temp = typeof item === 'object' ? (item.temperature || item.temp || item.value) : item;

            labels.push(`Day ${index + 1}`);
            temperatures.push(parseFloat(temp).toFixed(1));

            // Add table row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Day ${index + 1}</td>
                <td>${dateStr}</td>
                <td class="temp-value">${parseFloat(temp).toFixed(1)}°C</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Render chart
    renderChart(labels, temperatures);
}

// Render Chart.js line chart
function renderChart(labels, data) {
    const ctx = document.getElementById('forecast-chart').getContext('2d');

    // Destroy existing chart if present
    if (forecastChart) {
        forecastChart.destroy();
    }

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a2e',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(99, 102, 241, 0.1)'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(99, 102, 241, 0.1)'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return value + '°C';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Show forecast page
function showForecastPage() {
    loginPage.classList.remove('active');
    forecastPage.classList.add('active');

    // Update user display
    userDisplay.textContent = currentUser;
    userAvatar.textContent = currentUser.charAt(0).toUpperCase();

    // Clear login form
    loginForm.reset();
}

// Handle logout
function handleLogout() {
    currentUser = null;
    forecastPage.classList.remove('active');
    loginPage.classList.add('active');

    // Reset forecast form and hide chart
    forecastForm.reset();
    chartContainer.classList.remove('show');

    // Destroy chart if exists
    if (forecastChart) {
        forecastChart.destroy();
        forecastChart = null;
    }
}

// Show error message
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

// Hide error message
function hideError(element) {
    element.classList.remove('show');
}
