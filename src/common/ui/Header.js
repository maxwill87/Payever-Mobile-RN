import { Component } from 'react';
import { View } from 'react-native';

import StyleSheet from './StyleSheet';
import Text from './Text';

export default class Header extends Component {
  render() {
    let { children } = this.props;
    if (typeof children === 'string') {
      children = <Text style={styles.text}>{children}</Text>
    }

    return (
      <View
        {...this.props}
        children={children}
        style={[styles.component, this.props.style]}
      />
    );
  }
}

const styles = StyleSheet.create({
  component: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    borderBottomColor: '$pe_color_light_gray_1',
    borderBottomWidth: 1,
    '@media ios and (orientation: portrait)': {
      marginTop: 10
    }
  },

  text: {
    textAlign: 'center',
    color: '$pe_color_dark_gray',
  }
});