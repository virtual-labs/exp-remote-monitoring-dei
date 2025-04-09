// Chart configuration
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'second',
                    displayFormats: {
                        second: 'HH:mm:ss'
                    }
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Value'
                }
            }
        }
    }
};

// Initialize amCharts for each chart
const charts = {};

function createChart(containerId, title, color) {
    const root = am5.Root.new(containerId);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(am5xy.XYChart.new(root, {
        focusable: true,
        panX: true,
        panY: true,
        wheelX: "panX",
        wheelY: "zoomX"
    }));

    const xAxis = chart.xAxes.push(am5xy.DateAxis.new(root, {
        maxDeviation: 0.5,
        extraMin: -0.1,
        extraMax: 0.1,
        groupData: false,
        baseInterval: {
            timeUnit: "second",
            count: 1
        },
        renderer: am5xy.AxisRendererX.new(root, {
            minorGridEnabled: true,
            minGridDistance: 60
        }),
        tooltip: am5.Tooltip.new(root, {})
    }));

    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {})
    }));

    const series = chart.series.push(am5xy.LineSeries.new(root, {
        minBulletDistance: 10,
        name: title,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "value",
        valueXField: "date",
        tooltip: am5.Tooltip.new(root, {
            pointerOrientation: "horizontal",
            labelText: "{valueY}"
        })
    }));

    series.strokes.template.setAll({
        strokeWidth: 2,
        stroke: am5.color(color)
    });

    series.bullets.push(function() {
        return am5.Bullet.new(root, {
            locationX: undefined,
            sprite: am5.Circle.new(root, {
                radius: 4,
                fill: am5.color(color)
            })
        });
    });

    const cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
        xAxis: xAxis
    }));
    cursor.lineY.set("visible", false);

    chart.appear(1000, 100);

    return { root, chart, series };
}

// Initialize all charts
am5.ready(function() {
    charts.temperature = createChart("temperatureChart", "Temperature", "#FF6384");
    charts.humidity = createChart("humidityChart", "Humidity", "#36A2EB");
    charts.aqi = createChart("aqiChart", "AQI", "#4BC0C0");
    charts.heatIndex = createChart("heatIndexChart", "Heat Index", "#FF9F40");
});

// Generate random data within a range
function generateRandomData(min, max, decimals = 1) {
    return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

// Sensor monitoring states
const sensorStates = {
    temperature: true,
    humidity: true,
    aqi: true,
    heatIndex: true
};

// Dashboard state
let isDashboardActive = true;
let updateInterval;

// Alert thresholds
const alertThresholds = {
    temperature: {
        critical: { min: 0, max: 35 },
        warning: { min: 5, max: 30 }
    },
    humidity: {
        critical: { min: 0, max: 90 },
        warning: { min: 20, max: 80 }
    },
    aqi: {
        critical: { min: 0, max: 300 },
        warning: { min: 0, max: 200 }
    },
    heatIndex: {
        critical: { min: 0, max: 40 },
        warning: { min: 10, max: 35 }
    }
};

// Alert history
let alertHistory = [];
let isAlertsEnabled = true;

// Initialize dashboard with new features
document.addEventListener('DOMContentLoaded', () => {
    // Initialize master toggle
    const dashboardToggle = document.getElementById('dashboardToggle');
    dashboardToggle.addEventListener('change', (e) => {
        isDashboardActive = e.target.checked;
        updateDashboardState();
    });

    // Initialize alerts toggle
    const alertsToggle = document.getElementById('alertsToggle');
    alertsToggle.addEventListener('change', (e) => {
        isAlertsEnabled = e.target.checked;
    });

    // Initialize clear alerts button
    document.getElementById('clearAlertsBtn').addEventListener('click', clearAlerts);

    // Initialize toggle event listeners
    document.getElementById('temperatureToggle').addEventListener('change', (e) => {
        sensorStates.temperature = e.target.checked;
        updateSensorCardState('temperature', e.target.checked);
    });
    
    document.getElementById('humidityToggle').addEventListener('change', (e) => {
        sensorStates.humidity = e.target.checked;
        updateSensorCardState('humidity', e.target.checked);
    });
    
    document.getElementById('aqiToggle').addEventListener('change', (e) => {
        sensorStates.aqi = e.target.checked;
        updateSensorCardState('aqi', e.target.checked);
    });
    
    document.getElementById('heatIndexToggle').addEventListener('change', (e) => {
        sensorStates.heatIndex = e.target.checked;
        updateSensorCardState('heatIndex', e.target.checked);
    });

    // Initialize dashboard
    initializeDashboard();
});

// Update sensor card visual state
function updateSensorCardState(sensor, isActive) {
    const card = document.querySelector(`.sensor-card:nth-child(${getSensorIndex(sensor)})`);
    if (isActive) {
        card.classList.remove('disabled');
    } else {
        card.classList.add('disabled');
    }
}

// Get sensor index for card selection
function getSensorIndex(sensor) {
    const sensors = ['temperature', 'humidity', 'aqi', 'heatIndex'];
    return sensors.indexOf(sensor) + 1;
}

// Update dashboard state
function updateDashboardState() {
    const container = document.querySelector('.platform-container');
    
    if (isDashboardActive) {
        container.classList.remove('disabled');
        // Start updating data
        updateInterval = setInterval(updateAllCharts, 2000);
    } else {
        container.classList.add('disabled');
        // Stop updating data
        clearInterval(updateInterval);
        // Reset all values to '--'
        document.getElementById('temperatureValue').textContent = '--°C';
        document.getElementById('humidityValue').textContent = '--%';
        document.getElementById('aqiValue').textContent = '--';
        document.getElementById('heatIndexValue').textContent = '--°C';
    }
}

// Initialize the dashboard
function initializeDashboard() {
    // Initial data update
    updateAllCharts();
    
    // Start updating data every 2 seconds
    updateInterval = setInterval(updateAllCharts, 2000);
}

// Show notification toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    toast.textContent = message;
    toast.className = `notification-toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add alert to history
function addAlert(sensor, value, type) {
    if (!isAlertsEnabled) return;

    const now = new Date();
    const alert = {
        sensor,
        value,
        type,
        timestamp: now,
        message: `${sensor.charAt(0).toUpperCase() + sensor.slice(1)} ${type} alert: ${value}`
    };

    alertHistory.unshift(alert);
    updateAlertsDisplay();

    // Show toast notification for critical alerts
    if (type === 'critical') {
        showToast(alert.message, 'critical');
    }
}

// Update alerts display
function updateAlertsDisplay() {
    const container = document.getElementById('alertsContainer');
    container.innerHTML = '';

    // Keep only last 10 alerts
    alertHistory = alertHistory.slice(0, 10);

    alertHistory.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = `alert-item ${alert.type}`;
        alertElement.innerHTML = `
            <div class="alert-content">
                <i class="fas ${getAlertIcon(alert.type)} alert-icon"></i>
                <span class="alert-message">${alert.message}</span>
            </div>
            <span class="alert-timestamp">${alert.timestamp.toLocaleTimeString()}</span>
        `;
        container.appendChild(alertElement);
    });
}

// Get appropriate icon for alert type
function getAlertIcon(type) {
    switch (type) {
        case 'critical': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Clear all alerts
function clearAlerts() {
    alertHistory = [];
    updateAlertsDisplay();
}

// Check sensor values against thresholds
function checkThresholds(sensor, value) {
    const thresholds = alertThresholds[sensor];
    
    if (value <= thresholds.critical.min || value >= thresholds.critical.max) {
        addAlert(sensor, value, 'critical');
    } else if (value <= thresholds.warning.min || value >= thresholds.warning.max) {
        addAlert(sensor, value, 'warning');
    }
}

// Update all charts with new random data
function updateAllCharts() {
    if (!isDashboardActive) return;

    // Generate random values with realistic ranges
    const temperature = generateRandomData(15, 35);
    const humidity = generateRandomData(30, 90);
    const aqi = generateRandomData(0, 300);
    const heatIndex = generateRandomData(20, 40);

    // Check thresholds and add alerts
    checkThresholds('temperature', temperature);
    checkThresholds('humidity', humidity);
    checkThresholds('aqi', aqi);
    checkThresholds('heatIndex', heatIndex);

    // Update chart data
    updateChartData(charts.temperature, temperature);
    updateChartData(charts.humidity, humidity);
    updateChartData(charts.aqi, aqi);
    updateChartData(charts.heatIndex, heatIndex);

    // Update current values with color coding based on thresholds
    updateSensorValue('temperatureValue', temperature, '°C', [
        { threshold: 30, color: '#e74c3c' },
        { threshold: 20, color: '#3498db' },
        { threshold: 25, color: '#2ecc71' }
    ]);

    updateSensorValue('humidityValue', humidity, '%', [
        { threshold: 80, color: '#e74c3c' },
        { threshold: 40, color: '#3498db' },
        { threshold: 60, color: '#2ecc71' }
    ]);

    updateSensorValue('aqiValue', aqi, '', [
        { threshold: 200, color: '#e74c3c' },
        { threshold: 100, color: '#f39c12' },
        { threshold: 50, color: '#2ecc71' }
    ]);

    updateSensorValue('heatIndexValue', heatIndex, '°C', [
        { threshold: 35, color: '#e74c3c' },
        { threshold: 30, color: '#f39c12' },
        { threshold: 25, color: '#2ecc71' }
    ]);

    // Update data table
    updateDataTable(temperature, humidity, aqi, heatIndex);
}

// Update chart data
function updateChartData(chart, value) {
    const now = new Date();
    const data = chart.series.data.values;
    
    // Add new data point
    chart.series.data.push({
        date: now.getTime(),
        value: value
    });

    // Keep only the last 20 data points
    if (data.length > 20) {
        chart.series.data.removeIndex(0);
    }
}

// Update sensor value with color coding
function updateSensorValue(elementId, value, unit, thresholds) {
    const element = document.getElementById(elementId);
    let color = '#2c3e50'; // Default color

    // Find appropriate color based on thresholds
    for (const threshold of thresholds) {
        if (value > threshold.threshold) {
            color = threshold.color;
            break;
        }
    }

    // Update the value with color
    element.innerHTML = `<span style="color: ${color}">${value.toFixed(1)}${unit}</span>`;
}

// Update data table
function updateDataTable(temperature, humidity, aqi, heatIndex) {
    const tableBody = document.getElementById('dataTableBody');
    const now = new Date();
    
    // Add new row at the top
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${now.toLocaleString()}</td>
        <td>${temperature?.toFixed(1) || '--'}</td>
        <td>${humidity?.toFixed(1) || '--'}</td>
        <td>${aqi?.toFixed(1) || '--'}</td>
        <td>${heatIndex?.toFixed(1) || '--'}</td>
    `;
    
    tableBody.insertBefore(newRow, tableBody.firstChild);
    
    // Keep only the last 10 rows
    while (tableBody.children.length > 10) {
        tableBody.removeChild(tableBody.lastChild);
    }
}

// Export data to CSV
document.getElementById('exportTableBtn').addEventListener('click', () => {
    const rows = Array.from(document.querySelectorAll('#dataTableBody tr'));
    let csvContent = 'Timestamp,Temperature,Humidity,AQI,Heat Index\n';
    
    rows.forEach(row => {
        const cells = row.cells;
        csvContent += `${cells[0].textContent},${cells[1].textContent},${cells[2].textContent},${cells[3].textContent},${cells[4].textContent}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sensor_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}); 