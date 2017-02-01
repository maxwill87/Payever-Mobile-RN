import { Component } from 'react';
import { NavBar, StyleSheet, View } from 'ui';

import Contacts from '../components/contacts';

//noinspection JSUnresolvedVariable
import imgCommunication from '../images/communication.png';

export default class Main extends Component {
  static navigatorStyle = {
    navBarHidden: true,
  };

  render() {
    return (
      <View style={styles.container}>
        <NavBar.Default title="Communication" source={imgCommunication} />
        <Contacts />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});