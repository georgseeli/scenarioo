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

angular.module('scenarioo.controllers').controller('GeneralSettingsController', GeneralSettingsController);

function GeneralSettingsController(BranchesResource, ConfigService, ApplicationStatusService) {

    const vm = this;
    vm.branches = [];
    vm.configuration = {};
    vm.documentationDataDirectory = null;
    vm.configuredBranch = {};
    vm.successfullyUpdatedConfiguration = false;
    vm.searchEngineStatus = null;
    vm.resetConfiguration = resetConfiguration;
    vm.updateConfiguration = updateConfiguration;

    activate();

    function activate() {

        BranchesResource.query().subscribe((branches) => {
            vm.branches = branches;
            calculateConfiguredBranch();
        });

        ApplicationStatusService.getApplicationStatus().subscribe((status) => {
            vm.version = status.version;
            vm.configuration = status.configuration;
            vm.searchEngineStatus = status.searchEngineStatus;
            vm.documentationDataDirectory = status.documentationDataDirectory;

            calculateConfiguredBranch();

        });

    }

    function calculateConfiguredBranch() {
        if (angular.isUndefined(vm.branches) || angular.isUndefined(vm.configuration)) {
            return;
        }

        for (const branch of vm.branches) {
            if (branch.branch.name === vm.configuration.defaultBranchName) {
                vm.configuredBranch = branch;
            }
        }
    }

    function resetConfiguration() {
        vm.configuration = ConfigService.getRawConfigDataCopy();
        calculateConfiguredBranch();
    }

    function updateConfiguration() {
        vm.successfullyUpdatedConfiguration = false;

        ConfigService.updateConfiguration(vm.configuration, () => {
            vm.successfullyUpdatedConfiguration = true;
        });
    }
}