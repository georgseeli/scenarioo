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

declare var angular: angular.IAngularStatic;

angular.module('scenarioo.controllers')
    .component('scBranchAliases', {
        template: require('./branchAliases.html'),
        controller: BranchAliasesController,
        controllerAs: 'vm',
    });

function BranchAliasesController(BranchAliasesResource, BranchesResource) {

    const vm = this;
    vm.branches = [];
    vm.branchAliases = [];
    vm.uniqueError = false;
    vm.successfullyUpdatedBranchAliases = false;
    vm.deleteEntry = deleteEntry;
    vm.aliasNameChanged = aliasNameChanged;
    vm.reset = reset;
    vm.save = save;

    activate();

    function activate() {
        loadBranchAliases();
        loadBranchesWithoutAliases();
    }

    function loadBranchesWithoutAliases() {
        BranchesResource.query().subscribe((branches) => {
            const branchesWithoutAliases = [];
            let index;
            for (index = 0; index < branches.length; index++) {
                const branch = branches[index];
                if (!branch.isAlias) {
                    branchesWithoutAliases.push(branch);
                }
            }

            vm.branches = branchesWithoutAliases;
        });
    }

    function deleteEntry(aliasName) {
        if (aliasName !== '') {
            let index;
            for (index = 0; index < vm.branchAliases.length; index++) {
                const branchAlias = vm.branchAliases[index];
                if (branchAlias.name === aliasName) {
                    vm.branchAliases.splice(index, 1);
                    break;
                }
            }
        }
    }

    function aliasNameChanged() {
        const aliasName = vm.branchAliases[vm.branchAliases.length - 1].name;
        if (aliasName !== '') {
            vm.branchAliases.push(createEmptyAlias());
        }
    }

    function loadBranchAliases() {
        BranchAliasesResource.get().subscribe((branchAliases) => {
            branchAliases.push(createEmptyAlias());
            vm.branchAliases = branchAliases;
        });
    }

    function reset() {
        loadBranchAliases();
    }

    function save() {
        vm.uniqueError = false;
        vm.successfullyUpdatedBranchAliases = false;

        const branchAliasesToSave = [];
        let index;
        for (index = 0; index < vm.branchAliases.length; index++) {
            const branchAlias = vm.branchAliases[index];
            if (branchAlias.name !== '') {
                branchAliasesToSave.push(branchAlias);
            }
        }

        if (areBuildAliasesUnique(branchAliasesToSave) === false) {
            vm.uniqueError = true;
            return;
        }

        BranchAliasesResource.save(branchAliasesToSave)
        // tslint:disable-next-line
            .subscribe(() => {
            }); // We need to subscribe, otherwise the request won't be executed

        vm.successfullyUpdatedBranchAliases = true;
    }

    function areBuildAliasesUnique(buildAliases) {
        let unique = true;
        const aliasesMap = {};
        angular.forEach(buildAliases, (buildAlias) => {
            if (aliasesMap[buildAlias.name] === undefined) {
                aliasesMap[buildAlias.name] = '';
            } else {
                unique = false;
            }
        });

        return unique;
    }

    function createEmptyAlias() {
        return {
            name: '',
            referencedBranch: '',
            description: '',
        };
    }
}
