
// relax, the api keys in this script only get shared links and image thumbnails
const URL_ROOT = "https://images.maxoakes.dev"
const VIEW_KEY = "ZXACBRmfB2YEZWsxRu4S5tsxErUaTjPbeqqAK56UC4"
getSharedLinks();

function appendPolaroidFromApi(object) {
    const photo = $('<div>', { 
        class: 'photo random-rotate' 
    });
    const link = $('<a>', { 
        href: `${URL_ROOT}/s/${object.slug}`,
        target: "_blank"
    });
    console.log(object.slug)
    const image = $('<img>', { 
        src: `${URL_ROOT}/api/assets/${object.album.albumThumbnailAssetId}/thumbnail?apiKey=${VIEW_KEY}`, 
        alt: "Thumbnail of " + object.album.albumName 
    });
    const title = $('<h2>', { 
        class: 'handwritten-title' 
    }).text(object.album.albumName);
    const subtitle = $('<h3>', { 
        class: "handwritten" + String(randomFromSeed(new Date(object.album.updatedAt), 1, 9)) 
    }).text(object.description);

    photo.append(image, title, subtitle);
    link.append(photo).appendTo('.photo-container');

    function randomFromSeed(seed, min, max) {
        return ((seed) % (max - min)) + min;
    }
}

function appendErrorMessage(error) {
    const container = $('<div>', {class: "message-container"});

    const message = $('<h2>').text("Photo album server not reachable :(");

    // credit https://img.magnific.com/free-vector/cute-cat-sleeping-laptop-with-coffee-cartoon-vector-icon-illustration-animal-technology-icon_138676-4475.jpg?semt=ais_hybrid&w=740&q=80
    const image = $('<img>', { 
        src: "/asset/error/sleep.svg", 
        alt: "Sleeping cat on a computer",
        class: "sleep-image"
    });

    const errorMessage = $('<h3>').text(error);

    $(".photo-container").remove();
    container.append(message, errorMessage, image).appendTo('body');
}

async function getSharedLinks() {
    const url = `${URL_ROOT}/api/shared-links?apiKey=${VIEW_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        result.sort((a, b) => a.slug.localeCompare(b.slug)).forEach(appendPolaroidFromApi)
    } catch (error) {
        appendErrorMessage(error.message)
    }    
}

