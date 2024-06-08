/* eslint-disable
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let PermissionsManager

export default PermissionsManager = class PermissionsManager {
  constructor(ide, $scope) {
    this.ide = ide
    this.$scope = $scope
    this.$scope.permissions = {
      read: false,
      write: false,
      admin: false,
      comment: false,
    }
    this.$scope.$watch('permissionsLevel', permissionsLevel =>
      refreshPermissions(permissionsLevel, $scope.project.editable)
    )
    this.$scope.$watch('project.editable', editable =>
      refreshPermissions($scope.permissionsLevel, editable)
    )

    function refreshPermissions(permissionsLevel, editable) {
      if (permissionsLevel === 'readOnly') {
        $scope.permissions.read = true
        $scope.permissions.write = false
        $scope.permissions.admin = false
        $scope.permissions.comment = editable
      } else if (permissionsLevel === 'readAndWrite') {
        $scope.permissions.read = true
        $scope.permissions.write = editable
        $scope.permissions.comment = editable
      } else if (permissionsLevel === 'owner') {
        $scope.permissions.read = true
        $scope.permissions.write = editable
        $scope.permissions.admin = true
        $scope.permissions.comment = editable
      }

      if ($scope.anonymous) {
        $scope.permissions.comment = false
      }
    }
  }
}
