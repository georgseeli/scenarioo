'use strict';

var e2eUtils = require('../util/util.js');


function BaseWebPage(path) {
    this.path = path;
}

BaseWebPage.COMPARISON_DISABLE = 'Disable';


BaseWebPage.prototype.assertPageIsDisplayed = function () {
    e2eUtils.assertRoute(this.path);
};

BaseWebPage.prototype.assertRoute = function (expectedUrl) {
    e2eUtils.assertRoute(expectedUrl);
};


BaseWebPage.prototype.clickBrowserBackButton = function () {
    e2eUtils.clickBrowserBackButton();
};

BaseWebPage.prototype.assertElementIsEnabled = function (elementId) {
    expect(element(by.id(elementId)).getAttribute('disabled')).toBeFalsy();
};

BaseWebPage.prototype.assertElementIsDisabled = function (elementId) {
    expect(element(by.id(elementId)).getAttribute('disabled')).toBeTruthy();
};

BaseWebPage.prototype.clickElementById = function (elementId) {
    element(by.id(elementId)).click();
};

BaseWebPage.prototype.type = function (value) {
    element(by.css('body')).sendKeys(value);
};

/**
 * Navigate browser to a speficied path. By default (if not parameter is speficied) the path of the Page Object isused.
 *
 * @param path Overrides the default path of the page object. Specify only the part behind the # character.
 */
BaseWebPage.prototype.goToPage = function (path) {
    var targetPath;

    if (arguments.length === 1) {
        targetPath = path;
    } else {
        targetPath = this.path;
    }

    e2eUtils.getRoute(targetPath);
};

/**
 * Deprecated: same effect as startScenariooRevisited()
 */
BaseWebPage.prototype.initLocalStorage = function () {
    e2eUtils.initLocalStorage();
};

/**
 * Start scenarioo as a user that has never visited it before (visited cookie will not be set).
 */
BaseWebPage.prototype.startScenariooFirstTimeVisit = function () {
    e2eUtils.clearLocalStorage();
    e2eUtils.refreshBrowser(); // reload needed to restart without cookies.
};

/**
 * Start scenarioo as a user that has allready visited it before (visited cookie will be set).
 */
BaseWebPage.prototype.startScenariooRevisited = function() {
    e2eUtils.initLocalStorage();
};

BaseWebPage.prototype.chooseBranch = function (branchName) {
    // Open menu first, otherwise we cannot click
    element(by.partialLinkText('Branch:')).click();
    element(by.css('#branchSelectionDropdown .dropdown-menu')).all(by.partialLinkText(branchName)).first().click();
};

BaseWebPage.prototype.chooseBuild = function (buildName) {
    // Open menu first, otherwise we cannot click
    element(by.partialLinkText('Build:')).click();
    element(by.css('#build-selection-dropdown .dropdown-menu')).all(by.partialLinkText(buildName)).first().click();
};

BaseWebPage.prototype.chooseComparison = function (comparisonName) {
    // Open menu first, otherwise we cannot click
    element(by.partialLinkText('Comparison:')).click();
    element(by.css('#comparison-selection-dropdown .dropdown-menu')).all(by.partialLinkText(comparisonName)).first().click();
};

BaseWebPage.prototype.disableComparison = function () {
    if(element(by.partialLinkText('Comparison:')).isPresent()) {
        // Open menu first, otherwise we cannot click
        element(by.partialLinkText('Comparison:')).click();
        var comparisonElements = element(by.css('#comparison-selection-dropdown .dropdown-menu'));
        var disableEntry = comparisonElements.element(by.partialLinkText('Disable'));
        // It's not there if it's already disabled
        disableEntry.isPresent().then(function(isPresent) {
            if(isPresent) {
                disableEntry.click();
            }
        });
    }

};

BaseWebPage.prototype.assertSelectedComparison = function (comparisonName) {
    expect(element(by.css('#comparison-selection-dropdown > a')).getText()).toContain(comparisonName);
};

module.exports = BaseWebPage;
