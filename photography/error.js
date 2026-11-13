import * as TravelPhotographyLibrary from "./photography.js"

const connectionTest = await TravelPhotographyLibrary.getJsonResponse(`${TravelPhotographyLibrary.API_URL}/ping`);
if (!connectionTest) {
    appendErrorMessage(`Could not get a response from ${TravelPhotographyLibrary.API_URL}`)
}

function appendErrorMessage(error) {
    const container = $('<div>', {class: "message-container"});

    const message = $('<h2>').text("Photo album server not reachable :(");

    const image = $('<img>', { 
        src: "/asset/error/sleep.svg", 
        alt: "Sleeping cat on a computer",
        class: "sleep-image"
    });

    const errorMessage = $('<h3>').text(error);

    $(".presentation").empty();
    container.append(message, errorMessage, image).appendTo('.introduction');
}
