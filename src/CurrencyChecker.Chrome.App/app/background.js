var defaultSettings = {
    periodDelay: 1000,
    kantoAliorBankServerUrl: "https://kantor.aliorbank.pl/forex/json/current",
    alarmName: "periodAlarm"
};

var canvasElement = document.createElement("canvas");
canvasElement.width = 19;
canvasElement.height = 19;

var currencyDataExchanger = (function ($) {

    var self = {};
    var counter = 1;
    function setBadgeValue(value) {
        //chrome.browserAction.setBadgeText({
        //    text: value
        //});

        self.ticker.redraw();

    }

    function gotDataFromServer(reponseFromServer) {
        var valueForSell = getCurrentValueForEuro(reponseFromServer.currencies);
        setBadgeValue(valueForSell);
    };

    function onErrorAjaxHaler() {
        setBadgeValue("error");
    };

    function getCurrentValueForEuro(currencies) {
        for (var i = 0; i < currencies.length; i++) {
            if (currencies[i].currency1 === "PLN" &&
				currencies[i].currency2 === "EUR") {
                return currencies[i].buy;
            }
        }
        ;
    };

    function periodicEventHandler(alarm) {
        self.getCurrencies();
        self.repeat();
    };

    function createDelayedAction(settings) {
        chrome.alarms.create(defaultSettings.alarmName, {
            when: Date.now() + defaultSettings.periodDelay
        });
    }


    self.getCurrencies = function () {
        $.ajax({
            url: this.settings.kantoAliorBankServerUrl,
            dataType: "json",
            method: "GET",
            success: gotDataFromServer,
            error: onErrorAjaxHaler
        });
    };
    self.repeat = function () {
        createDelayedAction(this.settings);
    };

    self.init = function (defaultSettings, ticker) {
        this.ticker = ticker;
        this.settings = defaultSettings;
        chrome.alarms.onAlarm.addListener(periodicEventHandler);
        createDelayedAction(defaultSettings);
    };

    self.onRefreshingPeriodChange = function (refreshingPeriod) {
        self.settings.periodDelay = refreshingPeriod;
    }
    return self;
})($);

var iconTicker = (function (canvasElement) {
    var canvasHeight = 19;
    var canvasWidth = 19;
    var canvas = canvasElement;
    var firstTextPosition = canvasWidth;
    var secondTextPosition = canvasWidth;
    var currencyTextWidth = 38;
    var textShiftStep = 1;
    var self = this;
    var canPrintFirst = true;
    var canPrintSecond = false;

    var spaceBetweenTicks = 6;

    function redrawIcon(value) {
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "#262626";
        context.fillRect(0, 0, 19, 19);

        context.textAlign = "left";
        context.textBaseline = "top";
        //chrome.browserAction.setBadgeBackgroundColor({ color: "green" });
        chrome.browserAction.setBadgeText({ text: "SELL" });


        context.fillStyle = "white";
        context.font = "13px Arial";

        if (canPrintFirst) {
            context.fillText("4,1234", firstTextPosition, -1);
            firstTextPosition -= textShiftStep;
        }

        if (firstTextPosition < ((canvasWidth - spaceBetweenTicks) - currencyTextWidth)) {
            canPrintSecond = true;
        }

        if (firstTextPosition < 0 - currencyTextWidth) {
            firstTextPosition = canvasWidth;
            canPrintFirst = false;
        }

        if (canPrintSecond) {
            context.fillText("4,1234", secondTextPosition, -1);
            secondTextPosition -= textShiftStep;
        }

        if (secondTextPosition < ((canvasWidth - spaceBetweenTicks) - currencyTextWidth)) {
            canPrintFirst = true;
        }

        if (secondTextPosition < 0 - currencyTextWidth) {
            secondTextPosition = canvasWidth;
            canPrintSecond = false;
        }

        chrome.browserAction.setIcon({
            imageData: context.getImageData(0, 0, 19, 19)
        });
    };

    function init(currencyDataExchanger) {
        self.currencyDataExchanger = currencyDataExchanger;
        setInterval(redrawIcon, 80);


    };

    return {
        redraw: redrawIcon,
        init: init
    };
})(canvasElement);



currencyDataExchanger.init(defaultSettings, iconTicker);
iconTicker.init(currencyDataExchanger);
