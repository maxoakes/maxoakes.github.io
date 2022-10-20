const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const EXPECTED_SNAPSHOTS_PER_DAY = 8;
const STRING_UNIT_TEMP = "°F";
const STRING_UNIT_PRESSURE = " in";
const STRING_UNIT_PERCENT = "%";
const STRING_UNIT_SPEED = " mph";
const STRING_UNIT_DISTANCE = " km";
const STRING_UNIT_VOLUME = " mm";
let key = "";
let allWeatherConditions = {};

main();
function main()
{
	fetch('/key.json')
    	.then((response) => response.json())
    	.then((json) => key=json.key);

    async function success(position) {
        console.log(position.coords);
        let weather = await grabData(position.coords);
        console.log(weather);
		if (!weather)
		{
			return;
		}
		let snapshots = getForecastSnapshots(weather.forecast.list);
		let summaries = [];
		snapshots.forEach(day => {
			summaries.push(getDaySummary(day));
		});
		console.log(summaries);
		console.log(allWeatherConditions);
		
		for (let i = 0; i < summaries.length; i++)
		{
			addDescriptionHTML(summaries[i], i);
			addOverviewHTML(summaries[i], i);
		}
		addDescriptionHTML(weather.current, -1);
		addOverviewHTML(weather.current, -1);
		let titleText = document.getElementById("location-title");
		titleText.textContent = `${weather.current.name}`;
    }
  
    function error()
	{
        console.log("Unable to retrieve your location");
    }
  
    if (!navigator.geolocation)
	{
        console.log("Geolocation is not supported by your browser");
    }
	else
	{
        navigator.geolocation.getCurrentPosition(success, error);
    }
}

function addOverviewHTML(summary, dayNumber)
{
	let panel = document.getElementById(`day${dayNumber}-panel`);
	if (dayNumber === -1)
	{
		panel = document.getElementById(`today-panel`);
	};
	let name = document.createElement("p");
	name.className = "day-name";
	name.innerHTML = (dayNumber === -1) ? 
		"Now" :
		weekday[summary.date.getDay()];
	panel.appendChild(name);

	let icon = document.createElement("img");
	icon.className = "icon";
	icon.src = (dayNumber === -1) ? 
		`http://openweathermap.org/img/wn/${summary.weather[0].icon}@2x.png` : 
		`http://openweathermap.org/img/wn/${summary.condition.icon.substring(0,2)}d@2x.png`;
	panel.appendChild(icon);

	let description = document.createElement("p");
	description.className = "desc";
	description.innerHTML = (dayNumber === -1) ? 
		capitalizeFirstLetter(summary.weather[0].description) :
		capitalizeFirstLetter(summary.condition.description);
	panel.appendChild(description);

	let temp = document.createElement("p");
	temp.className = "temp";
	temp.innerHTML = (dayNumber === -1) ? 
		`Currently ${Math.round(summary.main.temp)}°F` :
		`HI: ${Math.round(summary.temp.max)}°F &emsp; LO: ${Math.round(summary.temp.min)}°F`;
	panel.appendChild(temp);
}

function addDescriptionHTML(summary, dayNumber)
{
	if (dayNumber === -1)
	{
		let targetContainer = document.getElementById(`today`);
		appendWeatherFieldEntry(targetContainer, "Temperature", getWeatherValueHTMLFromObject(summary.main.temp, 0, STRING_UNIT_TEMP));
		appendWeatherFieldEntry(targetContainer, "Feels like", getWeatherValueHTMLFromObject(summary.main.feels_like, 0, STRING_UNIT_TEMP));
		appendWeatherFieldEntry(targetContainer, "Humidity", getWeatherValueHTMLFromObject(summary.main.humidity, 0, STRING_UNIT_TEMP));
		appendWeatherFieldEntry(targetContainer, "Cloud Cover", getWeatherValueHTMLFromObject(summary.clouds.all, 0, STRING_UNIT_PERCENT));
		if (summary.visibility != 10000)
		{
			appendWeatherFieldEntry(targetContainer, "Visibility", getWeatherValueHTMLFromObject((summary.visibility/1000), 1, STRING_UNIT_DISTANCE));
		}
		appendWeatherFieldEntry(targetContainer, "Wind", [`${getWeatherValueHTMLFromObject(summary.wind.speed, 1, STRING_UNIT_SPEED)} ${getDirectionFromDegree(summary.wind.deg)}`]);
		appendWeatherFieldEntry(targetContainer, "Pressure", getWeatherValueHTMLFromObject(summary.main.pressure/29.53, 2, STRING_UNIT_PRESSURE));
	}
	else
	{
		let targetContainer = document.getElementById(`day${dayNumber}`);
		appendWeatherFieldEntry(targetContainer, "Temperature", getWeatherValueHTMLFromObject(summary['temp'], 0, STRING_UNIT_TEMP));
		appendWeatherFieldEntry(targetContainer, "Feels like", getWeatherValueHTMLFromObject(summary['feelsLike'], 0, STRING_UNIT_TEMP));
		appendWeatherFieldEntry(targetContainer, "Humidity", getWeatherValueHTMLFromObject(summary['humidity'], 0, STRING_UNIT_PERCENT));
		if (summary['pop'].max != 0)
		{
			appendWeatherFieldEntry(targetContainer, "Chance of Precip", getWeatherValueHTMLFromObject(summary['pop'], 0, STRING_UNIT_PERCENT));
			if (summary['rain'].max != 0)
			{
				appendWeatherFieldEntry(targetContainer, "Rain Volume", getWeatherValueHTMLFromObject(summary['rain'], 0, STRING_UNIT_VOLUME));
			}
			if (summary['snow'].max != 0)
			{
				appendWeatherFieldEntry(targetContainer, "Snow Volume", getWeatherValueHTMLFromObject(summary['snow'], 0, STRING_UNIT_VOLUME));
			}
		}
		if (summary['visibility'].min > 10)
		{
			appendWeatherFieldEntry(targetContainer, "Visibility", getWeatherValueHTMLFromObject(summary['visibility'], 0, STRING_UNIT_DISTANCE));
		}
		appendWeatherFieldEntry(targetContainer, "Cloud Cover", getWeatherValueHTMLFromObject(summary['clouds'], 0, STRING_UNIT_PERCENT));
		appendWeatherFieldEntry(targetContainer, "Pressure", getWeatherValueHTMLFromObject(summary['pressure'], 2, STRING_UNIT_PRESSURE));
		appendWeatherFieldEntry(targetContainer, "Wind Speed", getWeatherValueHTMLFromObject(summary['wind'], 0, STRING_UNIT_SPEED));
		appendWeatherFieldEntry(targetContainer, "Wind Gust Speed", getWeatherValueHTMLFromObject(summary['windGust'], 0, STRING_UNIT_SPEED));
	}
}

function appendWeatherFieldEntry(target, labelHTML, valueHTMLArray)
{
	let field = document.createElement("div");
	field.className = "weather-entry";
	target.appendChild(field);

	let iconDiv = document.createElement("img");
	iconDiv.className = "weather-field-icon";
	iconDiv.src = "../asset/icon/weather/cloud.png";
	field.appendChild(iconDiv);

	let labelDiv = document.createElement("div");
	labelDiv.className = "weather-field-label";
	labelDiv.innerHTML = labelHTML;
	field.appendChild(labelDiv);

	let valueDiv = document.createElement("div");
	valueDiv.className = "weather-field-value";
	valueDiv.innerHTML = valueHTMLArray[0];
	field.appendChild(valueDiv);

	if (valueHTMLArray.length > 1)
	{
		let valueDivMin = document.createElement("div");
		valueDivMin.className = "weather-field-value";
		valueDivMin.innerHTML = valueHTMLArray[2];
		field.appendChild(valueDivMin);

		let valueDivMax = document.createElement("div");
		valueDivMax.className = "weather-field-value";
		valueDivMax.innerHTML = valueHTMLArray[1];
		field.appendChild(valueDivMax);
	}
}

function getWeatherValueHTMLFromObject(object, precision, unit)
{
	if (typeof object === 'object')
	{
		switch (Object.keys(object).length)
		{
			case 3: return [`<span class='value-label'>Avg:</span> ${object.avg.toFixed(precision)}${unit}`,
							`<span class='value-label'>Hi:</span> ${object.max.toFixed(precision)}${unit}`,
							`<span class='value-label'>Lo:</span> ${object.min.toFixed(precision)}${unit}`];
			case 2: return [`${object.avg.toFixed(precision)}${unit} ± ${object.std.toFixed(precision)}${unit}`];
			default: return ["error"];
		}
	}
	else if (typeof object === "number")
	{
		return [`${object.toFixed(precision)}${unit}`];
	}
	else
	{
		return [object];
	}

}
function getHTMLForObject(object, title, unitString, precision)
{
	switch (Object.keys(object).length)
	{
		case 3: return `<span class='label'>${title}:</span>
						<span class='value'>
							<span class='avg'>${object.avg.toFixed(precision)}${unitString}</span> | 
							<span class='min'>${object.min.toFixed(precision)}${unitString}</span> | 
							<span class='max'>${object.max.toFixed(precision)}${unitString}</span>
						</span>`;
		case 2: return `${object.avg.toFixed(precision)}${unitString} ± 
						${object.std.toFixed(precision)}${unitString}`;
		default: return "error";
	}
}
//given a list of hour-by-hour weather snapshots, seperate them by day
//return only days that have a full picture, i.e. snapshots for the whole day
function getForecastSnapshots(snapshots)
{
	let days = [];
	let currentDay = -1;
	let currentIndex = -1;
	snapshots.forEach(element => {
		let date = new Date(element.dt*1000);
		if (date.getDay() != currentDay)
		{
			currentDay = date.getDay();
			currentIndex++;
			days[currentIndex] = [];
		}
		days[currentIndex].push(element);
	});
	return days.filter(day => day.length == EXPECTED_SNAPSHOTS_PER_DAY);
}

function getDaySummary(snapshots)
{
	const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
	const min = arr => arr.reduce((a, b) => Math.min(a, b));
	const max = arr => arr.reduce((a, b) => Math.max(a, b));
	const sum = arr => arr.reduce((a, b) => a + b, 0);
	const degToRad = deg => deg * Math.PI / 180.0;
	const radToDeg = rad => 180 / Math.PI * rad;

	//console.log(snapshots);
	let day = {};
	day.date = new Date(snapshots[0].dt*1000);

	//temp
	let allTemps = snapshots.map(x => x.main.temp);
	day.temp = {};
	day.temp.avg = avg(allTemps);
	day.temp.min = min(allTemps);
	day.temp.max = max(allTemps);

	//feels like temp
	let allFeelsLike = snapshots.map(x => x.main.feels_like);
	day.feelsLike = {};
	day.feelsLike.avg = avg(allFeelsLike);
	day.feelsLike.min = min(allFeelsLike);
	day.feelsLike.max = max(allFeelsLike);
	
	//humidity
	let allHumidity = snapshots.map(x => x.main.humidity);
	day.humidity = {};
	day.humidity.avg = avg(allHumidity);
	day.humidity.min = min(allHumidity);
	day.humidity.max = max(allHumidity);
	
	//visibility
	let allVisibility = snapshots.map(x => x.visibility);
	day.visibility = {};
	day.visibility.avg = avg(allVisibility)/1000;
	day.visibility.min = min(allVisibility)/1000;
	day.visibility.max = max(allVisibility)/1000;

	//pressure
	let allPressures = snapshots.map(x => x.main.grnd_level);
	day.pressure = {};
	day.pressure.avg = avg(allPressures)/29.53;
	day.pressure.min = min(allPressures)/29.53;
	day.pressure.max = max(allPressures)/29.53;

	let allClouds = snapshots.map(x => x.clouds.all);
	day.clouds = {};
	day.clouds.avg = avg(allClouds);
	day.clouds.min = min(allClouds);
	day.clouds.max = max(allClouds);

	let allPop = snapshots.map(x => x.pop*100);
	day.pop = {};
	day.pop.avg = avg(allPop);
	day.pop.min = min(allPop);
	day.pop.max = max(allPop);

	let allRainVolume = [];
	snapshots.forEach(snapshot => {
		allRainVolume.push((isFieldDefined(snapshot.rain) && isFieldDefined(snapshot.rain['3h'])) ? snapshot.rain['3h'] : 0);
	});
	day.rain = {};
	day.rain.avg = avg(allRainVolume);
	day.rain.min = min(allRainVolume);
	day.rain.max = max(allRainVolume);

	let allSnowVolume = [];
	snapshots.forEach(snapshot => {
		allSnowVolume.push((isFieldDefined(snapshot.snow) && isFieldDefined(snapshot.snow['3h'])) ? snapshot.snow['3h'] : 0);
	});
	day.snow = {};
	day.snow.avg = avg(allSnowVolume);
	day.snow.min = min(allSnowVolume);
	day.snow.max = max(allSnowVolume);

	let allWinds = snapshots.map(x => x.wind.speed);
	day.wind = {};
	day.wind.avg = avg(allWinds);
	day.wind.min = min(allWinds);
	day.wind.max = max(allWinds);

	let allGusts = snapshots.map(x => x.wind.gust);
	day.windGust = {};
	day.windGust.avg = avg(allGusts);
	day.windGust.min = min(allGusts);
	day.windGust.max = max(allGusts);

	let allDirections = snapshots.map(x => x.wind.deg);
	day.windDir = {};
	day.windDir.avg = radToDeg(Math.atan2(
		allDirections.reduce((a, b) => a + Math.sin(degToRad(b))) / allDirections.length,
		allDirections.reduce((a, b) => a + Math.cos(degToRad(b))) / allDirections.length
	));
	day.windDir.std = Math.sqrt((sum(allDirections.map(x => (x - day.windDir.avg)**2))) / allDirections.length);
	
	//most common description
	//https://openweathermap.org/weather-conditions
	snapshots.forEach(snapshot => {
		if (!isFieldDefined(allWeatherConditions[snapshot.weather[0].id]))
		{
			allWeatherConditions[snapshot.weather[0].id] = snapshot.weather[0];
			allWeatherConditions[snapshot.weather[0].id].count = 1;
		}
		else
		{
			allWeatherConditions[snapshot.weather[0].id].count++;
		}
	});

	let mostCommonCondition = 0;
	snapshots.forEach(snapshot => {
		if (!isFieldDefined(allWeatherConditions[snapshot.weather[0].id]))
		{
			allWeatherConditions[snapshot.weather[0].id] = snapshot.weather[0];
			allWeatherConditions[snapshot.weather[0].id].count = 1;
		}
		else
		{
			allWeatherConditions[snapshot.weather[0].id].count++;
		};

		if (mostCommonCondition === 0)
		{
			mostCommonCondition = snapshot.weather[0].id;
		}
		else
		{
			if (allWeatherConditions[mostCommonCondition].count < snapshot.weather[0].count)
			{
				mostCommonCondition = snapshot.weather[0].id;
			}
		}
	});
	day.condition = allWeatherConditions[mostCommonCondition];
	return day;
}

async function grabData(coords)
{
    let lat = coords.latitude;
    let lon = coords.longitude;
    // let lat = 45.25;
    // let lon = -61.97;
    try
    {
		let bundle = {};
		let currentCall = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&APPID=${key}`;
        //console.log(`Calling Current Weather ${currentCall}`);
        let currentResponse = await axios.get(currentCall);
		bundle.current = await currentResponse.data;

		let forecastCall = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&APPID=${key}`;
        //console.log(`Calling Forecast ${forecastCall}`);
        let forecastResponse = await axios.get(forecastCall);
		bundle.forecast = await forecastResponse.data;

        return bundle;
    }
    catch (error)
    {
        //console.error(error);
        return undefined;
    }
}

/*
 *  Helper Functions
*/

function capitalizeFirstLetter(string)
{
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function isBetween(value, min, max)
{
	return value >= min && value <= max;
}

function getDirectionFromDegree(degree)
{
	if (isBetween(degree, 348.75, 360) || isBetween(degree, 0, 11.25)) return "N";
	else if (isBetween(degree, 11.25, 33.75)) return "NNE";
	else if (isBetween(degree, 33.75, 56.25)) return "NE";
	else if (isBetween(degree, 56.25, 78.75)) return "ENE";
	else if (isBetween(degree, 78.75, 101.25)) return "E";
	else if (isBetween(degree, 101.25, 123.75)) return "ESE";
	else if (isBetween(degree, 123.75, 146.25)) return "SE";
	else if (isBetween(degree, 146.25, 168.75)) return "SSE";
	else if (isBetween(degree, 168.75, 191.25)) return "S";
	else if (isBetween(degree, 191.25, 213.75)) return "SSW";
	else if (isBetween(degree, 213.75, 236.25)) return "SW";
	else if (isBetween(degree, 236.25, 258.75)) return "WSW";
	else if (isBetween(degree, 258.75, 281.25)) return "W";
	else if (isBetween(degree, 281.25, 303.75)) return "WNW";
	else if (isBetween(degree, 303.75, 326.25)) return "NW";
	else if (isBetween(degree, 326.25, 348.75)) return "NNW";
	else return "Unknown Direction";
}

function isFieldDefined(field)
{
	return (field !== undefined && field != "");
}