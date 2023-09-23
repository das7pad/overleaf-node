/**
 * Provide $ as global and use full jQuery in angular.
 */
/* global require */
const $ = require('jquery')

// Provide `$` globally w/o explicit import.
export { $ }

// angular will read jQuery from window.
window.jQuery = $
