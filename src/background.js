function createPeriodicEvent(){
	chrome.alarms.create("getCurrencyData",{when: Date.now() + 900})
};

function gotDataFromServer(reponseFromServer){
	var valueForSell = getCurrentValueForEuro(reponseFromServer.currencies);
	chrome.browserAction.setBadgeText({text: valueForSell});
};

function onErrorAjaxHanlder(){
	console.log("ERROR occured.");
};

function getCurrentValueForEuro(currencies){
	for (var i = 0; i < currencies.length; i++) {
		if(currencies[i].currency1 === "PLN" && 
		   currencies[i].currency2 === "EUR")
		{
			return currencies[i].sell;
		}
	};
};

function getCurrencies(){
	$.ajax({
	url : "https://kantor.aliorbank.pl/forex/json/current",
	dataType "json",
	method : "GET",
	success : gotDataFromServer,
	error : onErrorAjaxHanlder
});
};

function periodicEventHandler(alarm){
  getCurrencies();
  
  createPeriodicEvent();
};

chrome.alarms.onAlarm.addListener(periodicEventHandler);

createPeriodicEvent();