var backgroundPage = chrome.extension.getBackgroundPage();
var currencyDataExchanger = backgroundPage.currencyDataExchanger;
var currentRefreshingPeriod = currencyDataExchanger.settings.periodDelay;


$("#refreshingPeriod").on("change", function (event) {
    var refreshingPerioElement = $(event.target);
    if (refreshingPerioElement.valid()) {
        var newRefreshingPeriod = parseInt(refreshingPerioElement.val());
        currencyDataExchanger.onRefreshingPeriodChange(newRefreshingPeriod);
    }
}).val(currentRefreshingPeriod);

