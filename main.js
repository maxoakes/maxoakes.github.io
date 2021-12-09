document.addEventListener('DOMContentLoaded', function() {
    {
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE");
    
        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) // If Internet Explorer, return version number
        {
            console.log("Internet Explorer detected");
            let messageForIE = document.createElement("p");
            messageForIE.innerHTML = "<hr>I see you are using Internet Explorer. For a better viewing experience, \
            I recommend using a different web browser or going directly to my \
            <a href='https://github.com/maxoakes'>Github</a> or my \
            <a href='https://www.linkedin.com/in/maxwell-oakes-11b211113/'>LinkedIn</a>.";
            document.getElementsByClassName("intro-text")[0].appendChild(messageForIE);
        }    
    }
}, false);