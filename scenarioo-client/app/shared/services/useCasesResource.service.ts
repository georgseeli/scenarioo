angular.module('scenarioo.services')
    .factory('UseCasesResource', (ScenariooResource) => {
        return ScenariooResource('/branche/:branchName/build/:buildName/usecase/:usecaseName',
            {
                branchName: '@branchName',
                buildName: '@buildName',
                usecaseName: '@usecaseName',
            }, {});
    });
