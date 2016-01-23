var backgroundPage = chrome.extension.getBackgroundPage();
var currencyDataExchanger = backgroundPage.currencyDataExchanger;
var currentRefreshingPeriod = currencyDataExchanger.settings.periodDelay;


var radioButtonsSelector = "input:radio[name='displayTickerMode']";

var radioInputs = $(radioButtonsSelector).on("change", function (event) {
    var radioElement = $(event.target);
    currencyDataExchanger.onTickerModeChanged(radioElement.val());
});

$(radioButtonsSelector + "[value='" + currencyDataExchanger.getCurrentDisplayTickerMode() + "']").prop("checked", true);

$("#refreshingPeriod").on("change", function (event) {
    var refreshingPerioElement = $(event.target);
    if (refreshingPerioElement.valid()) {
        var newRefreshingPeriod = parseInt(refreshingPerioElement.val());
        currencyDataExchanger.onRefreshingPeriodChanged(newRefreshingPeriod);
    }
}).val(currentRefreshingPeriod);

