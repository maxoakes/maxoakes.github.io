parse();
async function parse()
{
    let text = await getFile("/bookmarks/bookmarks.csv");
    let data = $.csv.toObjects(text);
    console.log(data);
    data.forEach(website => {
        appendLink(website);
    });
}

function appendLink(object)
{
	let link = document.createElement("a");
	link.href = object.url;
    link.innerText = object.name;

    let categoryElement = undefined;
    if (!document.getElementById(object.category))
    {
        categoryElement = document.createElement("div");
        categoryElement.id = object.category;
        categoryElement.className = "category";

        let categoryNameElement = document.createElement("p");
        categoryNameElement.className = "title";
        categoryNameElement.textContent = object.category;
        document.getElementById("content").appendChild(categoryElement);
        document.getElementById(object.category).appendChild(categoryNameElement);
    }
    else
    {
        categoryElement = document.getElementById(object.category);
    }
	categoryElement.appendChild(link);
}

async function getFile(file) {
	let response = await fetch(file);	
	if(response.status != 200)
    {
		throw new Error("Server Error");
	}
	let text = await response.text();
	return text;
}