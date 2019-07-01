'use strict';

import { scenario, step, useCase } from 'scenarioo-js';
import * as Utils from '../util';
import HomePage from '../pages/homePage';
import UsecasePage from '../pages/usecasePage';
import ScenarioPage from '../pages/scenarioPage';
import StepPage from '../pages/stepPage';

useCase('Step - View')
    .description('Display steps of a scenario and navigate through it. Includes the screenshot, details data and navigation buttons')
    .describe(() => {

        beforeEach(async () => {
            await Utils.startScenariooRevisited();
        });

        scenario('Navigation')
            .description('Navigate back and forth through the scenario steps.')
            .labels(['happy'])
            .it(async () => {
                const ROUTE_OF_FIRST_STEP = '/step/Find%20Page/find_no_results/startSearch.jsp/0/0';
                const ROUTE_OF_SECOND_STEP = '/step/Find%20Page/find_no_results/startSearch.jsp/0/1';
                const ROUTE_OF_THIRD_STEP = '/step/Find%20Page/find_no_results/searchResults.jsp/0/0';

                await HomePage.goToPage();
                await step('Display home page with list of use cases');

                await HomePage.selectUseCase(1);
                await step('Display list of scenarios');

                await UsecasePage.selectScenario(1);
                await step('Display one scenario');

                await ScenarioPage.openStepByName('Step 1: Wikipedia Suche');
                await Utils.assertRoute(ROUTE_OF_FIRST_STEP);
                await StepPage.assertPreviousStepIsDisabled();
                await StepPage.assertPreviousPageIsDisabled();
                await StepPage.assertNextStepIsEnabled();
                await StepPage.assertNextPageIsEnabled();
                await step('First step of scenario. Back buttons are disabled.');

                await StepPage.goToNextStep();
                await Utils.assertRoute(ROUTE_OF_SECOND_STEP);
                await StepPage.assertPreviousStepIsEnabled();
                await StepPage.assertPreviousPageIsDisabled();
                await StepPage.assertNextStepIsEnabled();
                await StepPage.assertNextPageIsEnabled();
                await step('Second step of scenario. Previous step button is now active.');

                await StepPage.goToNextPage();
                await Utils.assertRoute(ROUTE_OF_THIRD_STEP);
                await StepPage.assertPreviousStepIsEnabled();
                await StepPage.assertPreviousPageIsEnabled();
                await StepPage.assertNextStepIsDisabled();
                await StepPage.assertNextPageIsDisabled();
                await step('Second step of scenario. Previous step button is now active.');

                await StepPage.goToPreviousStep();
                await Utils.assertRoute(ROUTE_OF_SECOND_STEP);
                await StepPage.goToPreviousStep();
                await Utils.assertRoute(ROUTE_OF_FIRST_STEP);
                await StepPage.assertPreviousStepIsDisabled();
                await StepPage.assertPreviousPageIsDisabled();
                await StepPage.assertNextStepIsEnabled();
                await StepPage.assertNextPageIsEnabled();
                await step('Back on the first step.');
            });

        scenario('Step does not exist')
            .description('If the requested step does not exist, an error message is shown.')
            .it(async () => {
                await Utils.navigateToRoute('/step/Find Page/find_no_results/inexistent_page.jsp/0/42');
                await StepPage.assertErrorMessageIsShown();
                await StepPage.assertErrorResponseIsShown('GET', '404');
                await step('Error message.');
            });

        scenario('Fallback step exists')
            .description('A fallback message is shown in case the page does not exist but a fallback is found.')
            .it(async () => {
                await Utils.navigateToRoute('/step/Find%20Page/renamed_scenario/searchResults.jsp/0/0');
                await StepPage.assertFallbackMessageIsShown();
                await StepPage.assertFallbackMessageContainsText('Scenario: find_multiple_results');
                await step('Fallback message.');
            });

        scenario('Fallback to best match')
            .description('If the fallback mechanism finds multiple candidates, the one with the most matching labels is used.')
            .it(async () => {
                await Utils.navigateToRoute('/step/RenamedUseCase/DeletedScenario/contentPage.jsp/111/222?labels=exact%20match,i18n,step-label-2,public,page-label1,page-label2');
                await StepPage.assertFallbackMessageIsShown();
                await StepPage.assertFallbackMessageContainsText('Usecase: Switch Language');
                await StepPage.assertFallbackMessageContainsText('Scenario: search_article_in_german_and_switch_to_spanish');
                await StepPage.assertScenarioLabelsContain('i18n');
                await step('Of the 10 page variants, a fallback step with an i18n label is returned.');
            });

        scenario('Share step')
            .description('The step link popup shows the link to the step and to the image.')
            .it(async () => {
                await Utils.navigateToRoute('/step/Find Page/find_no_results/startSearch.jsp/0/0');
                await step('A step.');

                await StepPage.clickShareThisPageLink();
                await StepPage.assertStepLinksDialogVisible();
                const baseUrl = Utils.getBaseUrl();
                await StepPage.assertPageLink(baseUrl + '/#/step/Find%20Page/find_no_results/startSearch.jsp' +
                    '/0/0?branch=wikipedia-docu-example&build=last%20successful&comparison=Disabled' +
                    '&labels=normal-case,step-label-0,public,page-label1,page-label2');
                await StepPage.assertScreenshotLink(baseUrl  + '/rest/branch/wikipedia-docu-example/build' +
                    '/last%20successful/usecase/Find%20Page/scenario/find_no_results/pageName/startSearch.jsp' +
                    '/pageOccurrence/0/stepInPageOccurrence/0/image.png' +
                    '?labels=normal-case,step-label-0,public,page-label1,page-label2');
                await step('Step links dialog.');
            });

        scenario('Metadata with link to object')
            .description('Click on a object link in Call tree and jump to object example.action.StartInitAction')
            .it(async () => {
                await Utils.navigateToRoute('/step/Find%20Page/find_no_results/startSearch.jsp/0/0');
                await StepPage.openMetadataTabIfClosed(1);
                await step('Expand Call tree panel');

                await StepPage.clickOnLink('uiAction_example.action.StartInitAction');
                await StepPage.assertToolTipInBreadcrumb('uiAction: example.action.StartInitAction');
            });

        scenario('HTML view of current step')
            .description('If the step data contains html source data, it should be displayed in the HTML tab')
            .it(async () => {
                await Utils.navigateToRoute('/step/Find%20Page/find_no_results/startSearch.jsp/0/0');
                await step('A step');

                await StepPage.clickHtmlTabButton();
                await step('Switch to HTML tab');

                await StepPage.assertHtmlSourceEquals('<html>\n<head>\n</head>\n<body>\n   <p>just some dummy html code</p>\n</body>\n</html>');

                await StepPage.clickScreenshotTabButton();
                await step('Switch back to Screenshot tab');
            });

        scenario('Step without HTML source attached')
            .description('If the step data contains no html source data, the HTML tab should not be displayed at all')
            .it(async () => {
                await Utils.navigateToRoute('/step/Donate/find_donate_page/startSearch.jsp/0/0');
                await StepPage.assertHtmlTabIsHidden();
                await step('A step with no HTML source attached');
            });

    });
