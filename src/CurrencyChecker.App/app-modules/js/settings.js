var backgroundPage = chrome.extension.getBackgroundPage();
var currencyDataExchanger = backgroundPage.currencyDataExchanger;


$("#refreshingPeriod").on("change", function (event) {
    var refreshingPerioElement = $(event.target);

    currencyDataExchanger.onRefreshingPeriodChange(refreshingPerioElement.val());
});

