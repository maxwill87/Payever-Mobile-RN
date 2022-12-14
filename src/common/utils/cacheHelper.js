import { AsyncStorage } from 'react-native';
import { log } from './index';

let expireData = {};
loadExpireData();

function loadExpireData() {
  AsyncStorage.getItem('cache-expire')
    .then((result) => expireData = JSON.parse(result) || {})
    .catch(() => expireData = {});
}

function cacheKey(cacheId) {
  return 'cache:' + cacheId;
}

export default {
  isCacheUpToDate(cacheId, lifeTimeSeconds) {
    if (!cacheId) return false;

    const date = expireData ? expireData[cacheId] : null;
    if (!date) {
      return false;
    }

    const secondsPassed = (new Date() - new Date(date)) / 1000;
    return secondsPassed < lifeTimeSeconds;
  },

  isCacheAvailable(cacheId) {
    // TODO: implement this function
    return cacheId;
  },

  loadFromCache(cacheId) {
    if (!cacheId) return null;

    return AsyncStorage.getItem(cacheKey(cacheId))
      .then(result => JSON.parse(result))
      .catch(() => null);
  },

  saveToCache(cacheId, lifeTimeSeconds, data) {
    if (!cacheId) return;

    AsyncStorage.setItem(cacheKey(cacheId), JSON.stringify(data))
      .then(() => {
        if (lifeTimeSeconds) {
          this.saveExpireData(cacheId, lifeTimeSeconds);
        }
      })
      .catch(log.warn);
  },

  removeFromCache(cacheId) {
    if (!cacheId) return;

    AsyncStorage.removeItem(cacheKey(cacheId))
      .then(() => this.saveExpireData(cacheId))
      .catch(log.warn);
  },

  saveExpireData(cacheId, lifeTimeSeconds) {
    if (lifeTimeSeconds) {
      const expiredAt = new Date();
      expiredAt.setSeconds(expiredAt.getSeconds() + lifeTimeSeconds);
      expireData[cacheId] = expiredAt;
    } else {
      delete expireData[cacheId];
    }

    AsyncStorage.setItem('cache-expire', JSON.stringify(expireData))
      .catch(log.error);
  },
};