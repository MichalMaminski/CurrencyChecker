var backgroundPage = chrome.extension.getBackgroundPage();

ko.applyBindings(backgroundPage.viewModels.SettingsViewModel);