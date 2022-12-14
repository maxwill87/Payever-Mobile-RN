import { Component } from 'react';
import { inject, observer } from 'mobx-react/native';
import { Navigator } from 'react-native-navigation';
import { Icon, FlatTextInput, NavBar, StyleSheet, View } from 'ui';

import AddContactBlock from '../components/contacts/AddContactBlock';
import SelectedContacts from '../../contacts/components/SelectedContacts';

import CommunicationStore from '../../../store/communication';
import ContactsStore from '../../../store/contacts';

@inject('communication', 'contacts')
@observer
export default class StartNewConversations extends Component {
  static navigatorStyle = {
    navBarHidden: true,
  };

  props: {
    communication: CommunicationStore;
    contacts: ContactsStore;
    navigator: Navigator;
  };

  $messageTextInput: FlatTextInput;

  state: {
    messageText: string;
    messageHtml: string;
  };

  constructor(props) {
    super(props);

    this.state = {
      messageText: '',
      messageHtml: '',
    };
  }

  componentWillUnmount() {
    const { communication, contacts } = this.props;
    communication.clearContactsForAction();
    contacts.clearSelectedContacts();
  }

  onMessageEdited(messageHtml: string = '') {
    // Remove all html tags
    const messageText = messageHtml.replace(/<(.|\n)*?>/g, '');
    this.setState({ messageText, messageHtml  });
  }

  onOpenMessageEditor() {
    const { messageHtml, messageText } = this.state;

    this.props.navigator.push({
      screen: 'communication.EditMessage',
      animated: true,
      passProps: {
        message: messageHtml || messageText,
        onSave: this.onMessageEdited.bind(this),
        fullEditorMode: true,
      },
    });
  }

  onAddContacts() {
    const { messageHtml, messageText } = this.state;
    const { communication, navigator } = this.props;

    if (communication.isLoading) return;

    if (!messageText) {
      this.$messageTextInput.shakeElementAndSetFocus();
      return;
    }

    communication.sendInviteMsgToContacts(messageHtml || messageText);
    navigator.pop({ animated: true });
  }

  render() {
    const { communication, contacts } = this.props;
    const isContactsSelected = contacts.selectedContacts.length > 0
      || communication.contactsForAction.length > 0;

    return (
      <View style={styles.container}>
        <NavBar popup>
          <NavBar.Back />
          <NavBar.Title showTitle="always" title="Start Conversation" />
          <NavBar.Button title="Send" onPress={::this.onAddContacts} />
        </NavBar>
        <View style={styles.content}>
          <View style={styles.messageRow}>
            <FlatTextInput
              style={styles.messageInput}
              ref={ref => this.$messageTextInput = ref}
              placeholder="Message"
              onChangeText={text => this.setState({ messageText: text })}
              value={this.state.messageText}
            />
            <Icon
              onPress={::this.onOpenMessageEditor}
              style={styles.actionIcon}
              source="icon-edit-16"
            />
          </View>

          <AddContactBlock style={styles.addContactBlock} />

          {isContactsSelected && <SelectedContacts />}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 15,
  },

  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  messageInput: {
    flex: 1,
  },

  actionIcon: {
    fontSize: 24,
  },

  addContactBlock: {
    marginTop: 12,
  },

  bottomDockStyle: {
    $topHeight: '63%',
    top: '$topHeight',
  },
});