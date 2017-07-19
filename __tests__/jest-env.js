import React, { PropTypes } from 'react';
import { NativeModules, ScrollView } from 'react-native';

NativeModules.RNSound = { IsAndroid: false };
global.React = React;

// TODO: Find decision code below is for import WebView otherwise getting error
// TODO: Cannot read property 'decelerationRate' of undefined
ScrollView.propTypes = { decelerationRate: PropTypes.number };

/* eslint-disable global-require */
jest.mock('mobx-react/native', () => require('mobx-react/custom'))
  .mock('react-native-fetch-blob', () => ({ DocumentDir: '.' }))
  .mock('react-native-logging')
  .mock(
    '../src/common/utils/soundHelper/sounds',
    () => require('../src/common/utils/soundHelper/sounds/__mocks__')
  )
  .mock('../src/common/utils', () => ({
    apiHelper: require('../src/common/utils/apiHelper').default,
    cacheHelper: require('../src/common/utils/cacheHelper').default,
    deepLinksHelper:
      require.requireActual('../src/common/utils/deepLinksHelper').default,
    log: require.requireActual('react-native-logging'),
    networkHelper: require('../src/common/utils/networkHelper').default,
    screenParams: require('../src/common/utils/screenParams').default,
    soundHelper: require('../src/common/utils/soundHelper').default,
  }))
  .mock('react-native-navigation', () => ({
    ...require.requireActual('react-native-navigation'),
    Navigator: {},
  }))
  .mock('react-native-animatable')
  .mock('AsyncStorage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    multiGet: jest.fn(() => Promise.resolve()),
  }));