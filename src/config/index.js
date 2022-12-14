import generatedConfig from './_autogenerated';

export class Config {
  siteUrl: string;
  api: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
  };
  debug: {
    consoleLevel: boolean;
    logApiCall: boolean;
    logMobx: boolean;
    logSLevel: boolean;
    logSUrl: string;
    logWampCall: boolean;
  };
  reqTimeout: number = 10000;

  constructor(data) {
    data.debug = data.debug || {};
    Object.assign(this, data);
  }
}

export default new Config(generatedConfig);