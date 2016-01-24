var applicationSettings = {
    periodDelay: 1000,
    kantoAliorBankServerUrl: "https://kantor.aliorbank.pl/forex/json/current",
    alarmName: "periodAlarm"
};

var defaultUserSettings = {
    refreshingPeriod: 1000,
    tickerMode: "SELL"
};

var canvasElement = document.createElement("canvas");
canvasElement.width = 19;
canvasElement.height = 19;

var currencyState = {
    euroToPln: "N/A",
};

var userStorageManager = (function (userStorage, defaultUserSettings) {
    var self = this;
    var storage = userStorage;
    var defaultUserSettings = defaultUserSettings;

    self.loadUserSettings = function (callback) {
        storage.sync.get("user-settings", function (userSettings) {
            if ($.isEmptyObject(userSettings)) {
                self.saveUserSettings(defaultUserSettings);
                callback(defaultUserSettings);
            }
            else {
                callback(userSettings["user-settings"]);
            }
        })
    };

    self.saveUserSettings = function (userSettings) {
        storage.sync.set({
            "user-settings": userSettings
        });
    };

    self.userSettingsChanged = function (userSettings) {

        self.saveUserSettings(userSettings);
    };
    return self;
})(chrome.storage, defaultUserSettings);

var currencyDataExchanger = (function ($) {
    var self = {};
    function setBadgeValue(value) {
        self.currencyState.euroToPln = value;
    }

    function gotDataFromServer(reponseFromServer) {
        if (!self.ticker.STARTED) {
            self.ticker.init(currencyState, self.settings.userSettings.tickerMode);
        }
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

    function runCurrencyCheckingLogic(settings) {
        chrome.alarms.create(settings.applicationSettings.alarmName, {
            when: Date.now() + settings.userSettings.refreshingPeriod
        });
    }

    function userSettingsChanged() {
        self.storageManager.userSettingsChanged(self.settings.userSettings);
        self.ticker.userSettingsChanged(self.settings.userSettings);
    }

    self.getCurrencies = function () {

        $.ajax({
            url: this.settings.applicationSettings.kantoAliorBankServerUrl,
            dataType: "json",
            method: "GET",
            success: gotDataFromServer,
            error: onErrorAjaxHaler
        });
    };
    self.repeat = function () {
        runCurrencyCheckingLogic(self.settings);
    };

    self.init = function (applicationSettings, currencyState, ticker, storageManager) {
        self.ticker = ticker;
        self.storageManager = storageManager;
        self.currencyState = currencyState;
        self.settings = {
            applicationSettings: applicationSettings
        };
        storageManager.loadUserSettings(function (userSettings) {
            chrome.alarms.onAlarm.addListener(periodicEventHandler);
            self.settings.userSettings = userSettings;
            runCurrencyCheckingLogic(self.settings);
            self.getCurrencies();
        });
    };

    self.getCurrentDisplayTickerMode = function () {
        return self.settings.userSettings.tickerMode;
    }
    self.onRefreshingPeriodChanged = function (refreshingPeriod) {
        self.settings.userSettings.refreshingPeriod = refreshingPeriod;
        userSettingsChanged();
    }

    self.onTickerModeChanged = function (tickerDisplayMode) {
        self.settings.userSettings.tickerMode = tickerDisplayMode;
        userSettingsChanged();
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
    self.currencyTextWidth  = 38;
    self.textShiftStep = 0.25;
    self.intervalInMs = 15;
    self.spaceBetweenTicks = 6;
    self.pointWhereShowingTextIsAllow = ((self.canvasWidth - self.spaceBetweenTicks) - self.currencyTextWidth);

    //ticker texts state helpers
    self.canPrintFirst = true;
    self.canPrintSecond = false;

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

    self.userSettingsChanged = function (userSettings) {
        self.mode = userSettings.tickerMode;
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

    self.init = function (currencyState, tickerMode) {
        self.mode = tickerMode;
        self.currencyState = currencyState;
        setInterval(self.redrawIcon, self.intervalInMs);
        self.STARTED = true;
    };
    return self;
})(canvasElement);

currencyDataExchanger.init(applicationSettings, currencyState, iconTicker, userStorageManager);

