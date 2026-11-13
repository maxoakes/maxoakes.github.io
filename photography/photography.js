const IMAGES_URL = "https://images.maxoakes.dev"
const API_URL = "https://api.maxoakes.dev"
const IMMICH_KEY = "ZXACBRmfB2YEZWsxRu4S5tsxErUaTjPbeqqAK56UC4"

// Parse the slug URL and return its components. Expected in certain format
function parseSlug(slug) {
    let parts = slug.split("-")
    let code = Number(parts[0])
    
    // check if the code is valid (i.e. what the album type is)
    if (Number.isFinite(code)) {
        if (code >= 0 && code < 1000) {
            // Special collection, 0000-0999
            return {
                "code": code,
                "name": parts.slice(1).join(" "),
                "isLocation": false,
                "isTime": false
            }
        }
        else if (code >= 1000 && code < 4000) {
            // Time collection, 1000-3999
            return {
                "code": code,
                "year": code,
                "month": Number(parts[1]),
                "name": parts.slice(2).join(" "),
                "isLocation": false,
                "isTime": true
            }
        }
        else if (code >= 4000 && code < 9000) {
            // Location collection, 4000-8999
            return {
                "code": code,
                "country": parts[1],
                "region": parts[2],
                "name": parts.slice(3).join(" "),
                "isLocation": true,
                "isTime": false
            }
        }
        else if (code >= 9000 && code < 10000) {
            // Misc collection, 9000-9999
            return {
                "code": code,
                "name": parts.slice(1).join(" "),
                "isLocation": false,
                "isTime": false
            }
        }
        else {
            console.error(`Invalid slug: "${slug}". Expecting 0 < code < 10000.`)
            return null;
        }
    }
    else {
        console.error(`Unexpected slug: "${slug}". Expecting number as first value.`)
        return null;
    }
}

// Get all shared links in the desired category
async function getSharedLinksByCategory(category) {
    let codeMin = 0;
    let codeMax = 9999;
    if (typeof category === 'string')
    {
        switch (category) {
            case "duration":
            case "time":
                codeMin = 1000;
                codeMax = 3999;
                break;
            case "location":
            case "place":
                codeMin = 4000;
                codeMax = 8999;
                break;
            case "event":
            case "main":
            case "special":
                codeMin = 0;
                codeMax = 999;
                break;
            case "misc":
            case "other":
                codeMin = 9000;
                codeMax = 9999;
                break;
            case "all":
            default:
                codeMin = 0;
                codeMax = 9999;
                break;
        }
    }

    let links = await getJsonResponse(`${IMAGES_URL}/api/shared-links?apiKey=${IMMICH_KEY}`);
    if (links) {
        return links.filter((link) => {
            let slugData = parseSlug(link.slug)
            return (slugData && slugData.code >= codeMin && slugData.code <= codeMax)
        })
    }
    else {
        return [];
    }
}

// Create and return a custom object containing only needed information
async function getLocationAlbums() {
    let sharedLinks = await getSharedLinksByCategory("location");

    // Error handling if server is down
    if (sharedLinks.length === 0) {
        return [];
    }
    let albums = []

    await Promise.all(sharedLinks.map(async (link) => {

        // Get all album photo coordinates
        const albumMapMarkers = await getJsonResponse(`${IMAGES_URL}/api/albums/${link.album.id}/map-markers?apiKey=${IMMICH_KEY}`);

        // Get the location of the cover image, or the first image that has a lat and lon if the cover doesn't
        let albumLocation = albumMapMarkers.find(marker => marker.id === link.album.albumThumbnailAssetId)
        if (albumLocation == null) {
            albumLocation = albumMapMarkers.find(marker => (marker => marker, "lat") && Object.hasOwn(marker, "lon"));
        }
        
        let normalized = { 
            lat: albumLocation.lat,
            lon: albumLocation.lon,
            country: albumLocation.country,
            state: albumLocation.state
        }
        if (albumLocation) {
            // If the photo does not have metadata has geolocation data, use another service to find it
            if (normalized.country == null || normalized.state == null) {
                const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${albumLocation.lat}&lon=${albumLocation.lon}&format=json&zoom=8`
                let reverse = await getJsonResponse(osmUrl)
                if (reverse) {

                    // Only update the location names if they are null
                    if (normalized.country == null) {
                        normalized.country = reverse.address.country;
                    }

                    if (normalized.state == null) {
                        try {
                            normalized.state = reverse.address.state
                        }
                        catch {
                            console.warn("OSM response does not contain address.state")
                            normalized.state = reverse.address[reverse.addresstype];
                        }                    
                    }    
                }
                else {
                    console.warn(`Failed to get additional location data for ${link.slug}`)
                }
            }
        }

        albums.push({
            name: link.album.albumName,
            description: link.description,
            photoCount: albumMapMarkers.length,
            hyperlink: `${IMAGES_URL}/s/${link.slug}`,
            slug: link.slug,
            image: `${IMAGES_URL}/api/assets/${link.album.albumThumbnailAssetId}/thumbnail?apiKey=${IMMICH_KEY}`,
            ... normalized
        });
    }));

    return albums;
}

async function getVisitedCities() {
    let cities = await getJsonResponse(`${API_URL}/api/cities?visited=1&visited=2&visited=3&visited=4&visited=5&category=1&category=2&category=3&category=4`);
    if (!cities) return [];

    cities.forEach(city => {
        city.geojson = JSON.parse(city.geojson)
    });
    return cities;
}

// Generic HTTP GET -> JSON
async function getJsonResponse(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error during GET. \n ${error.message} \n ${url}`)
        return null;
    }
}

export {
    API_URL,
    IMAGES_URL,
    IMMICH_KEY,
    parseSlug,
    getLocationAlbums,
    getSharedLinksByCategory,
    getVisitedCities,
    getJsonResponse
}