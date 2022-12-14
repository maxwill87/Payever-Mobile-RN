import type PayeverApi from './../index';
import type UserAccount
  from '../../../store/profiles/models/UserAccount';
import PushNotificationsHelper from './PushNotificationsHelper';
import { log } from '../index';

export default {
  createInstance,
  getInstance,
};

let instance: PushNotificationsHelper = null;

function createInstance(
  api: PayeverApi,
  userProfile: UserAccount
): PushNotificationsHelper {
  if (!api || !userProfile) return null;
  instance = new PushNotificationsHelper(api, userProfile);
  return instance;
}

function getInstance(): PushNotificationsHelper {
  if (!instance) {
    log.error('Push notifications helper error while getting instance');
    throw new Error('Push notifications helper was not created');
  }

  return instance;
}