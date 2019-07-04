/* scenarioo-client
 * Copyright (C) 2014, scenarioo.org Development Team
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {ConfigurationService} from '../services/configuration.service';
import {BuildDiffInfoService} from '../diffViewer/services/build-diff-info.service';
import {StepDiffInfoService} from '../diffViewer/services/step-diff-info.service';
import {scenario} from 'scenarioo-js';

declare var angular: angular.IAngularStatic;

angular.module('scenarioo.controllers').controller('StepController', StepController);

function StepController($scope, $routeParams, $location, $route, StepResource, SelectedBranchAndBuildService,
                        $filter, ApplicationInfoPopupService, GlobalHotkeysService, LabelConfigurationsResource,
                        SharePageService, SketcherContextService, RelatedIssueResource, SketchIdsResource,
                        SketcherLinkService, BranchesAndBuildsService, ScreenshotUrlService, SelectedComparison,
                        BuildDiffInfoResource: BuildDiffInfoService,
                        StepDiffInfoResource: StepDiffInfoService,
                        DiffInfoService, localStorageService,
                        ConfigurationService: ConfigurationService) {

    const transformMetadataToTreeArray = $filter('scMetadataTreeListCreator');
    const transformMetadataToTree = $filter('scMetadataTreeCreator');

    let selectedBranchAndBuild: any = {};
    const useCaseName = $routeParams.useCaseName;
    const scenarioName = $routeParams.scenarioName;
    const labels = $location.search().labels;

    $scope.step = null; // loaded later, in activation
    $scope.pageName = $routeParams.pageName;
    $scope.pageOccurrence = parseInt($routeParams.pageOccurrence, 10);
    $scope.stepInPageOccurrence = parseInt($routeParams.stepInPageOccurrence, 10);
    $scope.comparisonInfo = SelectedComparison.info;
    $scope.activeTab = getActiveTab();
    $scope.refreshIfComparisonActive = refreshIfComparisonActive;

    $scope.comparisonViewOptions = {
        viewId: getLocalStorageValue('diffViewerStepComparisonViewId', 'SideBySide'),
        changesHighlighted: getLocalStorageBool('diffViewerStepComparisonChangesHighlighted'),
        diffImageColor: undefined,
    };

    activate();

    function activate() {
        SketcherLinkService.showCreateOrEditSketchLinkInBreadcrumbs('Create Sketch ...', createSketch);
        SelectedBranchAndBuildService.callOnSelectionChange(loadStep);
    }

    /**
     * reload the page to ensure that highlighted changes are properly aligned
     * if comparison highlights are activated and we are on the comparisons tab.
     */
    function refreshIfComparisonActive() {
        if ($scope.isComparisonChangesHighlighted() && $scope.activeTab === 2) {
            $route.reload();
        }
    }

    function createSketch() {
        $location.path('/editor/').search('mode', 'create');
    }

    $scope.modalScreenshotOptions = {
        backdropFade: true,
        dialogClass: 'modal modal-huge',
    };

    $scope.getPageNameUrlEncoded = () => encodeURIComponent($scope.pageName);

    LabelConfigurationsResource.query()
        .subscribe((labelConfigurations) => {
            $scope.labelConfigurations = labelConfigurations;
        });

    $scope.showApplicationInfoPopup = (tab) => {
        ApplicationInfoPopupService.showApplicationInfoPopup(tab);
    };

    function loadStep(selected) {
        selectedBranchAndBuild = selected;
        bindStepNavigation();
        loadStepFromServer(selected);
    }

    function stepResultToVm(result, selected) {
        $scope.stepIdentifier = result.stepIdentifier;
        $scope.fallback = result.fallback;
        $scope.step = result.step;
        $scope.metadataTree = transformMetadataToTreeArray(result.step.metadata.details);
        $scope.stepInformationTree = createStepInformationTree(result.step);
        $scope.pageTree = transformMetadataToTree(result.step.page);
        $scope.stepNavigation = result.stepNavigation;
        $scope.stepStatistics = result.stepStatistics;
        $scope.stepIndex = result.stepNavigation.stepIndex;
        $scope.useCaseLabels = result.useCaseLabels;
        $scope.scenarioLabels = result.scenarioLabels;
        $scope.selectedBuild = selected.buildName;
        loadRelatedIssues();
        initScreenshotUrl();
        if (SelectedComparison.isDefined()) {
            loadDiffInfoData(selected.branch, selected.build, SelectedComparison.selected());
        }

        $scope.hasAnyLabels = () => {
            const hasAnyUseCaseLabels = $scope.useCaseLabels.labels.length > 0;
            const hasAnyScenarioLabels = $scope.scenarioLabels.labels.length > 0;
            const hasAnyStepLabels = $scope.step.stepDescription.labels.labels.length > 0;
            const hasAnyPageLabels = $scope.step.page.labels.labels.length > 0;

            return hasAnyUseCaseLabels || hasAnyScenarioLabels || hasAnyStepLabels || hasAnyPageLabels;
        };

        SharePageService.setPageUrl($scope.getCurrentUrlForSharing());
        SharePageService.setImageUrl($scope.getScreenshotUrlForSharing());

        updateSketcherContextService();
    }

    function loadStepFromServer(selected) {

        StepResource.get(
            {
                branchName: selected.branch,
                buildName: selected.build,
            },
            useCaseName,
            scenarioName,
            $scope.pageName,
            $scope.pageOccurrence,
            $scope.stepInPageOccurrence,
            labels,
        )
            .subscribe((result) => stepResultToVm(result, selected),
                (error) => {
                    $scope.stepNotFound = true;
                    $scope.httpResponse = {
                        status: error.status,
                        method: 'GET',
                        url: error.url,
                        data: error.error,
                    };
                },
            );

    }

    function updateSketcherContextService() {
        SketcherContextService.stepIdentifier = {
            branchName: selectedBranchAndBuild.branch,
            buildName: selectedBranchAndBuild.build,
            usecaseName: useCaseName,
            scenarioName,
            pageName: $scope.pageName,
            pageOccurrence: $scope.pageOccurrence,
            stepInPageOccurrence: $scope.stepInPageOccurrence,
        };

        SketcherContextService.screenshotURL = $scope.screenShotUrl;
    }

    function createStepInformationTree(result) {
        const stepDescription = result.stepDescription;

        const stepInformation = {};

        if (angular.isDefined(stepDescription.title)) {
            stepInformation['Step title'] = stepDescription.title;
        }

        if (angular.isDefined(result.page)) {
            const pageToRender = angular.copy(result.page);
            // Will be displayed separately
            delete pageToRender.labels;
            stepInformation['Page name'] = pageToRender;
        }

        if (angular.isDefined(stepDescription.details)) {
            angular.forEach(stepDescription.details, (value, key) => {
                stepInformation[key] = value;
            });
        }

        if (angular.isDefined(stepDescription.status)) {
            stepInformation['Build status'] = stepDescription.status;
        }

        return transformMetadataToTree(stepInformation);
    }

    function bindStepNavigation() {
        $scope.isFirstStep = isFirstStep;
        $scope.isFirstPage = isFirstPage;
        $scope.isLastPage = isLastPage;
        $scope.goToPreviousStep = goToPreviousStep;
        $scope.goToNextStep = goToNextStep;
        $scope.goToPreviousPage = goToPreviousPage;
        $scope.goToNextPage = goToNextPage;
        $scope.goToFirstStep = goToFirstStep;
        $scope.goToLastStep = goToLastStep;
        $scope.isFirstPageVariantStep = isFirstPageVariantStep;
        $scope.goToPreviousVariant = goToPreviousVariant;
        $scope.isLastPageVariantStep = isLastPageVariantStep;
        $scope.goToNextVariant = goToNextVariant;
        $scope.getCurrentStepIndexForDisplay = getCurrentStepIndexForDisplay;
        $scope.getCurrentPageIndexForDisplay = getCurrentPageIndexForDisplay;
        $scope.getStepIndexInCurrentPageForDisplay = getStepIndexInCurrentPageForDisplay;
        $scope.getNumberOfStepsInCurrentPageForDisplay = getNumberOfStepsInCurrentPageForDisplay;
        $scope.isLastStep = isLastStep;

        GlobalHotkeysService.registerPageHotkeyCode(37, goToPreviousStep); // left arrow
        GlobalHotkeysService.registerPageHotkeyCode(39, goToNextStep); // right arrow
        GlobalHotkeysService.registerPageHotkeyCode('ctrl+37', goToPreviousPage); // control + left arrow
        GlobalHotkeysService.registerPageHotkeyCode('ctrl+39', goToNextPage); // control + right arrow
        GlobalHotkeysService.registerPageHotkeyCode('ctrl+36', goToFirstStep); // control + HOME
        GlobalHotkeysService.registerPageHotkeyCode('ctrl+35', goToLastStep); // control + END
        GlobalHotkeysService.registerPageHotkeyCode('ctrl+38', goToPreviousVariant); // control + up arrow
        GlobalHotkeysService.registerPageHotkeyCode('ctrl+40', goToNextVariant); // control + down arrow

        function isFirstStep() {
            return $scope.stepNavigation && $scope.stepNavigation.stepIndex === 0;
        }

        function isLastStep() {
            return $scope.stepNavigation && $scope.stepNavigation.stepIndex === $scope.stepStatistics.totalNumberOfStepsInScenario - 1;
        }

        function isFirstPage() {
            return $scope.stepNavigation && $scope.stepNavigation.pageIndex === 0;
        }

        function isLastPage() {
            return $scope.stepNavigation && $scope.stepNavigation.pageIndex === $scope.stepStatistics.totalNumberOfPagesInScenario - 1;
        }

        function goToPreviousStep() {
            if (!$scope.stepNavigation || !$scope.stepNavigation.previousStep) {
                return;
            }
            $scope.go($scope.stepNavigation.previousStep);
        }

        function goToNextStep() {
            if (!$scope.stepNavigation || !$scope.stepNavigation.nextStep) {
                return;
            }
            $scope.go($scope.stepNavigation.nextStep);
        }

        function goToPreviousPage() {
            if (!$scope.stepNavigation || !$scope.stepNavigation.previousPage) {
                return;
            }
            $scope.go($scope.stepNavigation.previousPage);
        }

        function goToNextPage() {
            if (!$scope.stepNavigation || !$scope.stepNavigation.nextPage) {
                return;
            }
            $scope.go($scope.stepNavigation.nextPage);
        }

        function goToFirstStep() {
            if (!$scope.stepNavigation || !$scope.stepNavigation.firstStep) {
                return;
            }
            $scope.go($scope.stepNavigation.firstStep);
        }

        function goToLastStep() {
            if (!$scope.stepNavigation || !$scope.stepNavigation.lastStep) {
                return;
            }
            $scope.go($scope.stepNavigation.lastStep);
        }

        function isFirstPageVariantStep() {
            return angular.isUndefined($scope.stepNavigation) || $scope.stepNavigation.previousStepVariant === null;
        }

        function goToPreviousVariant() {
            if ($scope.isFirstPageVariantStep()) {
                return;
            }
            $scope.go($scope.stepNavigation.previousStepVariant);
        }

        function isLastPageVariantStep() {
            return angular.isUndefined($scope.stepNavigation) || $scope.stepNavigation.nextStepVariant === null;
        }

        function goToNextVariant() {
            if ($scope.isLastPageVariantStep()) {
                return;
            }
            $scope.go($scope.stepNavigation.nextStepVariant);
        }

        function getCurrentStepIndexForDisplay() {
            if (angular.isUndefined($scope.stepNavigation)) {
                return '?';
            }
            return $scope.stepNavigation.stepIndex + 1;
        }

        function getCurrentPageIndexForDisplay() {
            if (angular.isUndefined($scope.stepNavigation)) {
                return '?';
            }
            return $scope.stepNavigation.pageIndex + 1;
        }

        function getStepIndexInCurrentPageForDisplay() {
            if (angular.isUndefined($scope.stepNavigation)) {
                return '?';
            }
            return $scope.stepNavigation.stepInPageOccurrence + 1;
        }

        function getNumberOfStepsInCurrentPageForDisplay() {
            if (angular.isUndefined($scope.stepStatistics)) {
                return '?';
            }
            return $scope.stepStatistics.totalNumberOfStepsInPageOccurrence;
        }
    }

    //  $route.reload necessary because of align diff and real image size
    $scope.setActiveTab = (activeTab) => {
        storeActiveTab(activeTab);
        $route.reload();
    };

    //  $route.reload necessary because of annotation calculation
    $scope.setDefaultTab = () => {
        storeActiveTab(0);
        $route.reload();
    };

    function storeActiveTab(activeTab) {
        sessionStorage.setItem('activeTab', activeTab);
    }

    function getActiveTab() {
        const activeTab: string = sessionStorage.getItem('activeTab');
        if (activeTab == null) {
            return 0;
        }
        if (activeTab === '2' && !$scope.comparisonInfo.isDefined) {
            return 0;
        }
        return angular.isDefined(activeTab) ? parseInt(activeTab, 10) : 0;
    }

    // This URL is only used internally, not for sharing
    function initScreenshotUrl() {
        if (angular.isUndefined($scope.step)) {
            return undefined;
        }

        const imageName = $scope.step.stepDescription.screenshotFileName;

        if (angular.isUndefined(imageName)) {
            return undefined;
        }

        const selected = SelectedBranchAndBuildService.selected();

        $scope.screenShotUrl = 'rest/branch/' + selected.branch + '/build/' + selected.build + '/usecase/' + $scope.stepIdentifier.usecaseName + '/scenario/' + $scope.stepIdentifier.scenarioName + '/image/' + imageName;
    }

    // This URL is only used internally, not for sharing
    function initScreenshotURLs() {
        initComparisonScreenshotUrl();
        initDiffScreenShotUrl();
    }

    function initComparisonScreenshotUrl() {
        $scope.comparisonScreenShotUrl = ScreenshotUrlService.getComparisonScreenShotUrl($scope.comparisonBranchName, $scope.comparisonBuildName, $scope.stepIdentifier.usecaseName, $scope.stepIdentifier.scenarioName, $scope.comparisonScreenshotName);
        $scope.comparisonScreenShotDescription = $scope.branch;
    }

    function initBaseBuildName() {
        BranchesAndBuildsService.getDisplayNameForBuildName(SelectedBranchAndBuildService.selected().branch, SelectedBranchAndBuildService.selected().build).then((result) => {
            $scope.baseBuildName = result;
        });
    }

    function initBaseBuild() {
        BranchesAndBuildsService.getBuild(SelectedBranchAndBuildService.selected().branch, SelectedBranchAndBuildService.selected().build).then((result) => {
            if (result) {
                $scope.baseBuild = result.build;
            }
        });
    }

    function initComparisonBuild() {
        BranchesAndBuildsService.getBuild($scope.comparisonBranchName, $scope.comparisonBuildName).then((result) => {
            if (result) {
                $scope.comparisonBuild = result.build;
            }
        });
    }

    // This URL is only used internally, not for sharing
    function initDiffScreenShotUrl() {
        if (!$scope.step.diffInfo.changeRate || $scope.step.diffInfo.changeRate === 0 || $scope.step.diffInfo.isAdded) {
            $scope.diffScreenShotUrl = $scope.screenShotUrl;
        } else if ($scope.stepIdentifier) {
            const branchAndBuild = SelectedBranchAndBuildService.selected();
            const comparisonName = SelectedComparison.selected();
            $scope.diffScreenShotUrl = ScreenshotUrlService.getDiffScreenShotUrl($scope.step, branchAndBuild, comparisonName, $scope.stepIdentifier.usecaseName, $scope.stepIdentifier.scenarioName, $scope.stepIndex);
        }
    }

    function loadDiffInfoData(baseBranchName, baseBuildName, comparisonName) {
        BuildDiffInfoResource.get(baseBranchName, baseBuildName, comparisonName)
            .subscribe((buildDiffInfo) => {
                $scope.comparisonName = buildDiffInfo.name;
                $scope.comparisonBranchName = buildDiffInfo.compareBuild.branchName;
                $scope.comparisonBuildName = buildDiffInfo.compareBuild.buildName;
                initBaseBuildName();
                initBaseBuild();
                initComparisonBuild();
                loadStepDiffInfo();
            }, () => {
                $scope.comparisonName = '';
                $scope.comparisonBranchName = '';
                $scope.comparisonBuildName = '';
            });
    }

    function loadStepDiffInfo() {
        // TODO danielsuter this will log an error 500 for added screenshots
        // failure function will be executed nevertheless, why is that?
        // We can not know if a screenshot is added, before we execute the call
        // see http://stackoverflow.com/questions/22113286/prevent-http-errors-from-being-logged-in-browser-console
        StepDiffInfoResource.get(SelectedBranchAndBuildService.selected().branch,
            SelectedBranchAndBuildService.selected().build,
            $scope.comparisonName,
            useCaseName,
            scenarioName,
            $scope.stepIndex)
            .subscribe((result) => {
                    $scope.comparisonScreenshotName = result.comparisonScreenshotName;
                    DiffInfoService.enrichChangedStepWithDiffInfo($scope.step, result);
                    initScreenshotURLs();
                },
                () => {
                    DiffInfoService.enrichChangedStepWithDiffInfo($scope.step, null);
                    initDiffScreenShotUrl();
                });
    }

    $scope.setComparisonView = (viewId) => {
        $scope.comparisonViewOptions.viewId = viewId;
        setLocalStorageValue('diffViewerStepComparisonViewId', viewId);
    };

    $scope.isComparisonView = (viewId) => $scope.step.diffInfo.isAdded
        ? viewId === 'SideBySide' // fixed side by side view for added steps
        : $scope.comparisonViewOptions.viewId === viewId;

    $scope.switchComparisonSingleScreenView = () => {
        const viewId = $scope.isComparisonView('CurrentScreen') ? 'OtherScreen' : 'CurrentScreen';
        $scope.setComparisonView(viewId);
    };

    $scope.isComparisonChangesToBeHighlightedAvailable = () => $scope.step && $scope.step.diffInfo && $scope.step.diffInfo.changeRate !== 0 && !$scope.step.diffInfo.isAdded;

    $scope.isComparisonChangesHighlighted = () => {
        // highlighting is turned on, and there are changes in this screenshot to be highlighted
        return $scope.isComparisonChangesToBeHighlightedAvailable() && $scope.comparisonViewOptions.changesHighlighted;
    };

    $scope.toggleComparisonChangesHighlighted = () => {
        $scope.comparisonViewOptions.changesHighlighted = !$scope.comparisonViewOptions.changesHighlighted;
        setLocalStorageValue('diffViewerStepComparisonChangesHighlighted', $scope.comparisonViewOptions.changesHighlighted);
    };

    $scope.getComparisonViewHighlightChangesColor = () => ConfigurationService.diffViewerDiffImageColor();

    function getLocalStorageBool(storageKey) {
        return localStorageService.get(storageKey) !== 'false';
    }

    function getLocalStorageValue(storageKey, value) {
        return localStorageService.get(storageKey) || value;
    }

    function setLocalStorageValue(storageKey, value) {
        localStorageService.set(storageKey, '' + value);
    }

    $scope.go = (step) => {
        $location.path('/step/' + (step.useCaseName || useCaseName) + '/' + (step.scenarioName || scenarioName) + '/' + step.pageName + '/' + step.pageOccurrence + '/' + step.stepInPageOccurrence);
    };

    $scope.getCurrentUrlForSharing = () => $location.absUrl() + createLabelUrl('&', getAllLabels());

    $scope.getScreenshotUrlForSharing = () => {
        if (SelectedBranchAndBuildService.isDefined() !== true) {
            return undefined;
        }

        return getUrlPartBeforeHash($location.absUrl()) + 'rest/branch/' + encodeURIComponent(SelectedBranchAndBuildService.selected()[SelectedBranchAndBuildService.BRANCH_KEY]) +
            '/build/' + encodeURIComponent(SelectedBranchAndBuildService.selected()[SelectedBranchAndBuildService.BUILD_KEY]) +
            '/usecase/' + encodeURIComponent(useCaseName) +
            '/scenario/' + encodeURIComponent(scenarioName) +
            '/pageName/' + encodeURIComponent($scope.pageName) +
            '/pageOccurrence/' + $scope.pageOccurrence +
            '/stepInPageOccurrence/' + $scope.stepInPageOccurrence + '/image.' + getImageFileExtension() + createLabelUrl('?', getAllLabels());
    };

    function getUrlPartBeforeHash(url) {
        return url.split('#')[0];
    }

    const getImageFileExtension = () => {
        if (angular.isUndefined($scope.step)) {
            return '';
        }

        const imageFileName = $scope.step.stepDescription.screenshotFileName;

        if (!angular.isString(imageFileName)) {
            return '';
        }

        const fileNameParts = imageFileName.split('.');
        return fileNameParts[fileNameParts.length - 1];
    };

    const getAllLabels = () => {
        let allLabels = [];
        if ($scope.useCaseLabels && $scope.scenarioLabels && $scope.step) {
            allLabels = allLabels.concat($scope.useCaseLabels.labels).concat($scope.scenarioLabels.labels).concat($scope.step.stepDescription.labels.labels).concat($scope.step.page.labels.labels);
        }
        return allLabels;
    };

    const createLabelUrl = (prefix, labelsForUrl) => {
        if (angular.isUndefined(labelsForUrl) || !angular.isArray(labelsForUrl) || labelsForUrl.length === 0) {
            return '';
        }

        return prefix + 'labels=' + labelsForUrl.map(encodeURIComponent).join();
    };

    $scope.$on('$destroy', () => {
        SharePageService.invalidateUrls();
        SketcherLinkService.hideCreateOrEditSketchLinkInBreadcrumbs();
    });

    function loadRelatedIssues() {
        RelatedIssueResource.query({
            branchName: SelectedBranchAndBuildService.selected().branch,
            buildName: SelectedBranchAndBuildService.selected().build,
            useCaseName,
            scenarioName,
            pageName: $scope.pageName,
            pageOccurence: $scope.pageOccurrence,
            stepInPageOccurrence: $scope.stepInPageOccurrence,
        }, (result) => {
            $scope.relatedIssues = result;
            $scope.hasAnyRelatedIssues = () => $scope.relatedIssues.length > 0;
            $scope.goToIssue = goToIssue;
        });
    }

    function goToIssue(issue) {
        const selectedBranch = SelectedBranchAndBuildService.selected().branch;
        SketchIdsResource.get(
            {branchName: selectedBranch, issueId: issue.id},
            (result) => {
                $location.path('/stepsketch/' + issue.id + '/' + result.scenarioSketchId + '/' + result.stepSketchId);
            });
    }

}
