import App from '../base'

App.factory('eventTracking', factory)
App.factory('eventTracking2', factory)

function factory() {
  return {
    enabled: false,
    send(category, action, label, value) {},
    sendGAOnce(category, action, label, value) {},
    editingSessionHeartbeat() {},
    sendMB(key, segmentation) {},
    sendMBSampled(key, segmentation, rate) {},
    sendMBOnce(key, segmentation) {},
    eventInCache(key) {},
  }
}
