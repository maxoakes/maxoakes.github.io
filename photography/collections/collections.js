
import * as TravelPhotographyLibrary from "../photography.js"

let sharedLinks = await TravelPhotographyLibrary.getSharedLinksByCategory();
if (sharedLinks) {
    sharedLinks = sharedLinks.sort((a, b) => a.slug.localeCompare(b.slug)).forEach(appendPolaroidFromApi)
}

function appendPolaroidFromApi(object) {
    const photo = $('<div>', { 
        class: 'photo random-rotate' 
    });
    const link = $('<a>', { 
        href: `${TravelPhotographyLibrary.IMAGES_URL}/s/${object.slug}`,
        target: "_blank"
    });
    const image = $('<img>', { 
        src: `${TravelPhotographyLibrary.IMAGES_URL}/api/assets/${object.album.albumThumbnailAssetId}/thumbnail?apiKey=${TravelPhotographyLibrary.IMMICH_KEY}`, 
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