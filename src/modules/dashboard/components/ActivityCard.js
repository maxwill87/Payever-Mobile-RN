import { Component } from 'react';
import { Image, Link, StyleSheet, Text, View } from 'ui';

//noinspection JSUnresolvedVariable
import type { Navigator } from 'react-native-navigation';

import type ActivityItem from '../../../store/UserProfilesStore/ActivityItem';

export default class ActivityCards extends Component {
  props: {
    navigator: Navigator;
    activity: ActivityItem;
  };

  onLinkPress() {
    const { navigator, activity } = this.props;
    navigator.push({
      title: activity.title,
      screen: 'core.WebView',
      passProps: { url: activity.activityUrl },
    });
  }

  render() {
    const { activity } = this.props;

    return (
      <View style={styles.container}>
        <Image style={styles.icon} source={activity.iconSource} />
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.description}>{activity.plainDescription}</Text>
        <Image style={styles.image} source={activity.imageSource} />
        <Link style={styles.link} onPress={::this.onLinkPress}>
          {activity.url_label}
        </Link>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 27,
    paddingTop: 25,
    paddingBottom: 15,
    margin: 10,
    marginBottom: 20,
    shadowColor: 'rgba(0, 0, 0, .1)',
    shadowRadius: 7,
    shadowOffset: {
      width: -3,
      height: 7,
    },
    shadowOpacity: 1,
    elevation: 4,
    borderRadius: 8,
    maxWidth: 320,
    '@media (max-width: 320)': {
      width: '80%',
    },
    overflow: 'hidden',
  },

  icon: {
    marginBottom: 12,
    width: 34,
    height: 34,
    '@media (max-height: 570)': {
      marginBottom: 0,
      height: 0,
    },

  },

  title: {
    fontSize: 24,
    marginBottom: 10,
    color: '$pe_color_dark_gray',
  },

  description: {
    marginBottom: 10,
    color: '$pe_color_gray_2',
  },

  image: {
    height: 230,
    marginBottom: 10,
    resizeMode: 'contain',
    '@media (max-height: 440)': {
      height: 0,
    },
  },

  link: {
    position: 'absolute',
    bottom: 15,
    left: 27,
    textShadowColor: '#fff',
    textShadowRadius: 3,
  },
});