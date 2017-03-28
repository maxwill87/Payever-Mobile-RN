import { Component } from 'react';
import { inject, observer } from 'mobx-react/native';
import { NavBar, StyleSheet, View, WebView } from 'ui';
import ProfilesStore from '../../../store/profiles';

@inject('profiles')
@observer
export default class AddContact extends Component {
  static navigatorStyle = {
    navBarHidden: true,
  };

  props: {
    profiles?: ProfilesStore;
  };

  render() {
    const profile = this.props.profiles.currentProfile;

    const uri = profile.getCommunicationUrl() + '#new/message';
    const js = `(${injectedJs.toString()})()`;

    return (
      <View style={styles.container}>
        <NavBar popup>
          <NavBar.Back />
          <NavBar.Title title="Add a contact" />
        </NavBar>
        <WebView
          injectJs={js}
          showLoader
          showNavBar="never"
          source={{ uri }}
        />
      </View>
    );
  }
}

// eslint-disable-next-line consistent-return
function injectedJs() {
  /* eslint-disable */
  /** @name callWebViewOnMessage */
  /** @name Messenger */
  /** @name Messenger.Application */
  /** @name Messenger.View */
  /** @name Messenger.View.ModalFormView */

  Messenger.View.ModalFormView.prototype.childEvents = function() {
    setTimeout(showDialog, 300);
  };

  Messenger.Application.prototype.closeModal = function() {
    callWebViewOnMessage({ command: 'back' });
  };

  function showDialog() {
    callWebViewOnMessage({ command: 'hide-loader' });
    var $btnCancel = document.querySelector('.btn-default');
    if ($btnCancel) {
      $btnCancel.style.display = 'none';
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});