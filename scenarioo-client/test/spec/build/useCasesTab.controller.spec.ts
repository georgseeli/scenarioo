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

'use strict';

import {of} from 'rxjs';

declare var angular: angular.IAngularStatic;

describe('UseCasesTabController', () => {

    let $location, $scope;
    let useCasesTabController;

    const LabelConfigurationsResourceMock = {
        query: () => of({}),
    };
    const ConfigurationServiceMock = {
    };

    beforeEach(angular.mock.module('scenarioo.controllers'));
    beforeEach(angular.mock.module('scenarioo.services', ($provide) => {
        // TODO: Remove after complete AngularJs -> Angular Migration
        $provide.value('BuildDiffInfoResource', {});
        $provide.value('BranchesAndBuildsService', {});
        $provide.value('SelectedBranchAndBuildService', {
            callOnSelectionChange: () => {
            },
        });
        $provide.value('UseCasesResource', {});
        $provide.value('UseCaseDiffInfosResource', {});
        $provide.value("LabelConfigurationsResource", LabelConfigurationsResourceMock);
        $provide.value('ConfigurationService', ConfigurationServiceMock);
    }));

    beforeEach(inject(($controller, $rootScope, _$location_) => {
            $location = _$location_;

            $scope = $rootScope.$new();
            useCasesTabController = $controller('UseCasesTabController', {$scope: $scope});
        }
    ));

    it('has no usecases and builds set in the beginning', () => {
        expect(useCasesTabController.useCases.length).toBe(0);
        expect(useCasesTabController.branchesAndBuilds.length).toBe(0);
    });

    it('navigates to use case when link is clicked', () => {
        expect($location.path()).toBe('');

        const dummyUseCase = {name: 'DisplayWeather', diffInfo: {isRemoved: false}};
        useCasesTabController.gotoUseCase(dummyUseCase);

        expect($location.path()).toBe('/usecase/DisplayWeather');
    });

});
