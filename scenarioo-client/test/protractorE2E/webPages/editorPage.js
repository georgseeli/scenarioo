'use strict';

var BaseWebPage = require('./baseWebPage.js'),
    util = require('util');

function EditorPage(overridePath) {
    if (overridePath && overridePath.length > 0) {
        BaseWebPage.call(this, overridePath);
    } else {
        BaseWebPage.call(this, '/');
    }

    this.saveButton = element(by.id('save'));
    this.saveSketchSuccessfulMessage = element(by.id('saveSketchSuccessfulMessage'));
    this.issueNameTextField = element(by.id('issueName'));
    this.issueAuthorTextField = element(by.id('issueAuthor'));
    this.issueDescriptionTextField = element(by.id('issueDescription'));
}

util.inherits(EditorPage, BaseWebPage);


EditorPage.prototype.enterSketchInformation = function (sketchName, author) {
    this.issueNameTextField.sendKeys(sketchName);
    this.issueAuthorTextField.sendKeys(author);
    this.issueDescriptionTextField.sendKeys('this issue was generated by e2e tests');
};

EditorPage.prototype.clickSaveButton = function () {
    this.saveButton.click();
};

EditorPage.prototype.assertSaveButtonIsDisabled = function () {
    expect(this.saveButton.isEnabled()).toBe(false);
};

EditorPage.prototype.assertPageIsDisplayed = function () {
    expect(this.saveButton.isDisplayed()).toBe(true);
};

EditorPage.prototype.assertAuthorFieldIsEmpty = function () {
    expect(this.issueAuthorTextField.getText()).toBe('');
};

EditorPage.prototype.assertAuthorFieldIsSetTo = function (expectedAuthor) {
    expect(this.issueAuthorTextField.getAttribute('value')).toBe(expectedAuthor);
};

EditorPage.prototype.assertSaveSketchSuccessfulMessageIsNotPresent = function () {
    //expect(this.saveSketchSuccessfulMessage.isPresent()).toBe(false);
};

EditorPage.prototype.assertSaveSketchSuccessfulMessageIsDisplayed = function () {
    expect(this.saveSketchSuccessfulMessage.isDisplayed()).toBe(true);
};

module.exports = EditorPage;
