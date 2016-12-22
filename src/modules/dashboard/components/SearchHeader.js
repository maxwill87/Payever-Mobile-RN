import type UserProfilesStore from '../../../store/UserProfilesStore';

import { Component } from 'react';
import { inject, observer } from 'mobx-react/native';
import { Icon, ImageButton, StyleSheet, View, Text } from 'ui';

@inject('userProfiles')
@observer
export default class SearchHeader extends Component {
  props: {
    navigator: Navigator,
    title?: string,
    userProfiles?: UserProfilesStore
  };

  onProfilePress() {
    const { navigator } = this.props;
    navigator.toggleDrawer({ side: 'right' });
  }

  render() {
    const { userProfiles, title } = this.props;

    if (!userProfiles.privateProfile) {
      return null;
    }

    return (
      <View style={styles.container}>
        <Icon name="icon-search-16" style={styles.search} />
        <Text style={styles.title}>{title}</Text>
        <ImageButton
          source={userProfiles.currentProfile.logoSource}
          style={styles.profile}
          onPress={::this.onProfilePress}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginTop: 10,
    marginBottom: 0,
    '@media ios and (orientation: portrait)': {
      marginTop: 30
    }
  },

  search: {
    color: '#b5b9be',
  },

  title: {
    flex: 1,
    textAlign: 'center'
  },

  profile: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    borderRadius: 15
  }
});