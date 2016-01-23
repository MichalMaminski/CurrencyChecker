var defaultSettings = {
    periodDelay: 1000,
    kantoAliorBankServerUrl: "https://kantor.aliorbank.pl/forex/json/current",
    alarmName: "periodAlarm"
};

var canvasElement = document.createElement("canvas");
canvasElement.width = 19;
canvasElement.height = 19;

var currencyState = {
    euroToPln: "N/A",
};

var currencyDataExchanger = (function ($) {

    var self = {};
    function setBadgeValue(value) {
        if (!self.ticker.STARTED) {
            self.ticker.init(currencyState);
        }
        self.currencyState.euroToPln = value;
    }

    function gotDataFromServer(reponseFromServer) {
        var valueForSell = getCurrentValueForEuro(reponseFromServer.currencies);
        setBadgeValue(valueForSell);
    };

    function onErrorAjaxHaler() {
        setBadgeValue("error");
        chrome.browserAction.setIcon({
            path: "/assets/main-icon.png"
        });
    };

    function getCurrentValueForEuro(currencies) {
        for (var i = 0; i < currencies.length; i++) {
            if (currencies[i].currency1 === "PLN" &&
				currencies[i].currency2 === "EUR") {
                return currencies[i][self.ticker.mode.toLowerCase()];
            }
        };
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

    self.init = function (defaultSettings, currencyState, ticker) {
        self.ticker = ticker;
        self.settings = defaultSettings;
        self.currencyState = currencyState;
        chrome.alarms.onAlarm.addListener(periodicEventHandler);
        createDelayedAction(defaultSettings);
    };

    self.getCurrentDisplayTickerMode = function () {
        return self.ticker.mode;
    }
    self.onRefreshingPeriodChanged = function (refreshingPeriod) {
        self.settings.periodDelay = refreshingPeriod;
    }

    self.onTickerModeChanged = function (tickerDisplayMode) {
        self.ticker.mode = tickerDisplayMode;
    }
    return self;
})($);

var iconTicker = (function (canvasElement) {
    var self = {};
    self.STARTED = false;
    //CANVAS settings
    self.canvasHeight = 19;
    self.canvasWidth = 19;
    self.canvas = canvasElement;
    self.firstTextXPosition = self.canvasWidth;
    self.secondTextXPosition = self.canvasWidth;

    //ticker text settings
    self.textYPosition = -1;
    self.currencyTextWidth = 38;
    self.textShiftStep = 0.25;
    self.intervalInMs = 15;
    self.spaceBetweenTicks = 6;
    self.pointWhereShowingTextIsAllow = ((self.canvasWidth - self.spaceBetweenTicks) - self.currencyTextWidth);

    //ticker texts state helpers
    self.canPrintFirst = true;
    self.canPrintSecond = false;
    self.mode = "SELL";

    function setCavasContextProperties(context) {
        context.clearRect(0, 0, self.canvasWidth, self.canvasHeight);
        context.fillStyle = "#262626";
        context.fillRect(0, 0, 19, 19);
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillStyle = "white";
        context.font = "13px Arial";
    }

    function setBadge(tickerDisplayMode) {
        chrome.browserAction.setBadgeBackgroundColor({ color: "#00FF00" });
        chrome.browserAction.setBadgeText({ text: tickerDisplayMode });
    }

    function printTickerText(canvasContext, canPrint, tickerText, textXPosition) {
        if (canPrint) {
            canvasContext.fillText(tickerText, textXPosition, self.textYPosition);
            textXPosition -= self.textShiftStep;
        }
        return textXPosition;
    }

    function checkIfTextCanBePrinted(canPrintText, textXPosition) {
        if (textXPosition < self.pointWhereShowingTextIsAllow) {
            canPrintText = true;
        }
        return canPrintText;
    }

    function resetTextXPosition(canPrint, textXPosition) {
        if (textXPosition < 0 - self.currencyTextWidth) {
            textXPosition = self.canvasWidth;
            canPrint = false;
        }
        return {
            canPrint: canPrint,
            textXPosition: textXPosition
        };
    }

    self.redrawIcon = function () {
        var context = self.canvas.getContext('2d');
        setCavasContextProperties(context);
        setBadge(self.mode);

        //Logic for first ticker text
        self.firstTextXPosition = printTickerText(context, self.canPrintFirst, self.currencyState.euroToPln, self.firstTextXPosition);
        self.canPrintSecond = checkIfTextCanBePrinted(self.canPrintSecond, self.firstTextXPosition);

        var textStateForFirstTextTicker = resetTextXPosition(self.canPrintFirst, self.firstTextXPosition);
        self.canPrintFirst = textStateForFirstTextTicker.canPrint;
        self.firstTextXPosition = textStateForFirstTextTicker.textXPosition;

        //Logic for second ticker text
        self.secondTextXPosition = printTickerText(context, self.canPrintSecond, self.currencyState.euroToPln, self.secondTextXPosition);
        self.canPrintFirst = checkIfTextCanBePrinted(self.canPrintFirst, self.secondTextXPosition);

        var textStateForSecondTextTicker = resetTextXPosition(self.canPrintSecond, self.secondTextXPosition);
        self.canPrintSecond = textStateForSecondTextTicker.canPrint;
        self.secondTextXPosition = textStateForSecondTextTicker.textXPosition;

        chrome.browserAction.setIcon({
            imageData: context.getImageData(0, 0, self.canvasWidth, self.canvasHeight)
        });
    };

    self.init = function (currencyState) {
        self.currencyState = currencyState;
        setInterval(self.redrawIcon, self.intervalInMs);
        self.STARTED = true;
    };
    return self;
})(canvasElement);

currencyDataExchanger.init(defaultSettings, currencyState, iconTicker);

