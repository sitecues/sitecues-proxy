// function getExistingLoaders($) {
//     // Strategy 1: data-provider="sitecues" attribute
//     let existingLoaders = $('script[data-provider=\"sitecues\"]');
//     console.log('hey ' + existingLoaders.length);

//     // Strategy 2: find a script with a src that contains sitecues in the name, or has our comment
//     if (!existingLoaders.length) {
//         let $scripts = $('script');
//         console.log($scripts.length);

//         existingLoaders = $scripts.filter(function(index, elem) {
//             // Contains our comment?
//             const text = elem.innerText;
//             console.log(text);
//             if (text && text.indexOf('// DO NOT MODIFY THIS SCRIPT WITHOUT ASSISTANCE FROM SITECUES') >= 0) {
//                 return true;
//             }
//             // Contains a sitecues.js?
//             const src = elem.getAttribute('src');
//             return src && src.indexOf('/sitecues-loader.js') >= 0;
//         });
//         console.log(existingLoaders[0]);
//     }

//     return existingLoaders;

// }
