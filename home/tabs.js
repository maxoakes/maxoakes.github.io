function openTab(e, tabName, tabClass)
{
	let tabContentDOM = document.getElementsByClassName(tabClass);
	for (let i = 0; i < tabContentDOM.length; i++)
	{
		tabContentDOM[i].style.display = "none";
	}

	let tabLinks = document.getElementsByClassName("tab-link");
	for (let i = 0; i < tabLinks.length; i++)
	{
		tabLinks[i].className = tabLinks[i].className.replace(" active", "");
	}

	document.getElementById(tabName).style.display = "block";
	e.currentTarget.className += " active";
}