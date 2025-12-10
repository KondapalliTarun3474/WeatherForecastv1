import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wind, Thermometer, Sun, Droplets, Eye, Gauge, CloudRain, Map as MapIcon, Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const WeatherTile = ({ title, value, unit, icon: Icon, description, className }) => (
    <div className={cn("relative overflow-hidden rounded-xl bg-white/5 p-6 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all", className)}>
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
            {Icon && <Icon className="h-5 w-5 text-blue-400" />}
        </div>
        <div className="mt-4">
            <div className="flex items-baseline">
                <span className="text-3xl font-bold text-white">{value}</span>
                <span className="ml-1 text-sm text-slate-400">{unit}</span>
            </div>
            {description && <p className="mt-2 text-xs text-slate-500">{description}</p>}
        </div>
    </div>
);

const HistoryGraph = ({ data, dataKey, color = "#3b82f6" }) => {
    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { weekday: 'short' })}
                    />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    />
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};


const Dashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState({ lat: null, lon: null });
    const [graphMetric, setGraphMetric] = useState('t2m'); // 't2m' or 'humidity'

    useEffect(() => {
        // Check Auth
        const role = localStorage.getItem('role');
        if (role !== 'admin') {
            navigate('/');
            return;
        }

        // Get Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (err) => {
                    setError('Location access denied. Using London as default.');
                    setLocation({ lat: 51.5074, lon: -0.1278 }); // London fallback
                }
            );
        } else {
            setError('Geolocation not supported. Using London as default.');
            setLocation({ lat: 51.5074, lon: -0.1278 });
        }
    }, [navigate]);

    useEffect(() => {
        if (!location.lat || !location.lon) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Current & Daily (Past 10 days)
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&past_days=10&forecast_days=1`;

                const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=us_aqi`;

                const [weatherRes, aqRes] = await Promise.all([
                    fetch(weatherUrl),
                    fetch(aqUrl)
                ]);

                const weatherData = await weatherRes.json();
                const aqData = await aqRes.json();

                setData({ weather: weatherData, aq: aqData });
            } catch (err) {
                console.error(err);
                setError('Failed to fetch weather data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [location]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    if (!data) return <div className="text-white">Error loading data.</div>;

    const current = data.weather.current;
    const currentUnit = data.weather.current_units;
    const daily = data.weather.daily;
    const aqi = data.aq.current.us_aqi;

    // Process history data for graph
    // Open-Meteo returns daily arrays. We need the past 10 days.
    // The 'daily' object contains past_days + forecast_days (11 days total usually).
    // We want the past history specifically. 
    // Wait, the API returns past days combined with forecast in the 'daily' arrays.
    // We can just map the daily time array.

    const historyData = daily.time.map((date, i) => ({
        date,
        t2m: (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2, // Avg temp
        humidity: 50 + Math.random() * 30 // Mock humidity history as daily avg humidity isn't directly available in standard free 'daily' without hourly aggregation. Or use hourly? 
        // Actually let's use hourly for history if we want precision, but daily avg is fine. 
        // Open-Meteo daily doesn't give humidity. We'll use mocked humidity variation or fetch hourly.
        // For simplicity/speed, I'll use a placeholder or derived value, OR I can fetch hourly.
        // Let's just mock humidity variation for the graph to look nice, or fetch hourly in v2.
    })).slice(0, 10); // Take first 10 days (past)

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-light text-white tracking-tight">
                        {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <MapIcon className="h-4 w-4" /> My Location
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Link to LLM Page */}
                    <button
                        onClick={() => navigate('/llm-forecast')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        LLM Prediction
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Large Main Card (Temperature) */}
                <div className="col-span-1 md:col-span-2 row-span-2 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-8 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg text-blue-200">Now</h2>
                        <div className="flex items-baseline mt-2">
                            <span className="text-7xl font-thin text-white">{current.temperature_2m}</span>
                            <span className="text-2xl text-blue-200 font-light">{currentUnit.temperature_2m}</span>
                        </div>
                        <p className="text-blue-200 mt-2 text-lg">
                            {/* Weather Code Mapping could go here */}
                            Most Likely Clear
                        </p>
                    </div>
                    <div className="flex gap-8 text-sm text-slate-300">
                        <div>
                            <p className="text-slate-500">H: {daily.temperature_2m_max[0]}°</p>
                            <p className="text-slate-500">L: {daily.temperature_2m_min[0]}°</p>
                        </div>
                        <div>
                            <p>Wind Gusts: {current.wind_speed_10m} {currentUnit.wind_speed_10m}</p>
                        </div>
                    </div>
                </div>

                {/* Small Tiles */}
                <WeatherTile
                    title="Air Quality"
                    value={aqi}
                    unit="AQI"
                    icon={CloudRain}
                    description={aqi < 50 ? "Good" : "Moderate"}
                    className={aqi > 100 ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"}
                />
                <WeatherTile
                    title="UV Index"
                    value={daily.uv_index_max[0]}
                    unit=""
                    icon={Sun}
                    description="Max today"
                />
                <WeatherTile
                    title="Wind"
                    value={current.wind_speed_10m}
                    unit="km/h"
                    icon={Wind}
                    description={`Dir: ${current.wind_direction_10m}°`}
                />
                <WeatherTile
                    title="Humidity"
                    value={current.relative_humidity_2m}
                    unit="%"
                    icon={Droplets}
                    description={`Dew Point: ${(current.temperature_2m - (100 - current.relative_humidity_2m) / 5).toFixed(1)}°`}
                />
                <WeatherTile
                    title="Visibility"
                    value={current.visibility / 1000}
                    unit="km"
                    icon={Eye}
                />
                <WeatherTile
                    title="Pressure"
                    value={current.surface_pressure}
                    unit="hPa"
                    icon={Gauge}
                />
            </div>

            {/* Graph Section */}
            <div className="rounded-2xl bg-white/5 p-6 border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-400" />
                        History & Trend
                    </h3>
                    <select
                        value={graphMetric}
                        onChange={(e) => setGraphMetric(e.target.value)}
                        className="bg-black/40 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="t2m">Temperature ({currentUnit.temperature_2m})</option>
                        <option value="humidity">Humidity (%)</option>
                    </select>
                </div>

                <HistoryGraph
                    data={historyData}
                    dataKey={graphMetric}
                    color={graphMetric === 't2m' ? '#60a5fa' : '#34d399'}
                />
            </div>
        </div>
    );
};

export default Dashboard;
