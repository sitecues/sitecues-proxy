// NOTE: This file is essentially a utility, it constructs and returns
// lists of test suite module IDs for test automation

define(
    [   // dependencies...
        './unit',
        './functional'
    ],
    function (unitSuites, functionalSuites) {

        // Prepend each test suite with its directory name, to make
        // them proper module IDs as the testing system expects
        prependDir('unit', unitSuites);
        prependDir('functional', functionalSuites);

        function prependDir(dir, list) {

            var len;

            if (list && typeof list === 'object' && (len = list.length) > 0) {
                for (i = 0; i < len; i = i + 1) {
                    list[i] = dir + '/' + list[i];
                }
            }

            return list;
        }

        return {
            unit       : unitSuites,
            functional : functionalSuites
        };
    }
)
