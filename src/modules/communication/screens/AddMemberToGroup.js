import { Component } from 'react';
import { inject, observer } from 'mobx-react/native';
import { NavBar, StyleSheet, View } from 'ui';

import SelectedContacts from '../../contacts/components/SelectedContacts';
import AddContactBlock from '../components/contacts/AddContactBlock';
import type CommunicationStore from '../../../store/communication';
import type ContactsStore from '../../../store/contacts';

@inject('communication', 'contacts')
@observer
export default class AddMemberToGroup extends Component {
  static navigatorStyle = {
    navBarHidden: true,
  };

  props: {
    communication: CommunicationStore;
    contacts: ContactsStore;
  };

  componentWillUnmount() {
    const { communication, contacts } = this.props;
    communication.clearContactsForAction();
    contacts.clearSelectedContacts();
  }

  onAddMembersToGroup() {
    const { communication } = this.props;
    if (communication.isLoading) return;

    communication.addAllMembersToGroup(communication.selectedConversation.id);
  }

  render() {
    const { communication, contacts } = this.props;
    const isContactsSelected = contacts.selectedContacts.length > 0
      || communication.contactsForAction.length > 0;

    return (
      <View style={styles.container}>
        <NavBar>
          <NavBar.Back title="Settings" showTitle="always" />
          <NavBar.Title title="Add Member" />
          <NavBar.Button
            title="Save"
            onPress={::this.onAddMembersToGroup}
            unwind
          />
        </NavBar>
        <View style={styles.content}>
          <AddContactBlock bottomDockStyle={styles.bottomDockPos} />

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
    paddingTop: 12,
    paddingHorizontal: 15,
  },

  bottomDockPos: {
    $topHeight: '72%',
    top: '$topHeight',
  },
});