import { Component, PropTypes } from 'react';
import { Animated } from 'react-native';
import { inject, observer } from 'mobx-react/native';
import type { Navigator } from 'react-native-navigation';
import { IconButton, StyleSheet } from 'ui';

import CommunicationStore from '../../../../store/communication';

const INIT_TOP = 20;
const SHOW_TOP = 70;

@inject('communication')
@observer
export default class SettingsFloatMenu extends Component {
  static contextTypes = {
    navigator: PropTypes.object.isRequired,
  };

  context: {
    navigator: Navigator;
  };

  props: {
    communication?: CommunicationStore;
    conversationId: number;
    onRemove?: (cb?: () => void) => void;
    style?: Object;
  };

  state: {
    animValue: Animated.Value;
  };

  constructor(props) {
    super(props);

    this.state = {
      animValue: new Animated.Value(INIT_TOP),
    };
  }

  componentDidMount() {
    Animated.timing(this.state.animValue, {
      toValue: SHOW_TOP,
      duration: 200,
    }).start();
  }

  onSendOffer() {
    const { conversationId } = this.props;

    this.context.navigator.push({
      screen: 'marketing.CreateOffer',
      passProps: { conversationId },
    });

    this.onRemove();
  }

  onSearchMessages() {
    const { communication: { ui } } = this.props;
    ui.setSearchMessagesMode(true);
    this.onRemove();
  }

  onRemove() {
    this.hideSettingsPopup(this.props.onRemove);
  }

  onUserInfoPress() {
    const { communication } = this.props;
    const { navigator } = this.context;
    const { selectedConversation: conversation } = communication;

    if (!conversation) return;

    if (conversation.isGroup) {
      navigator.push({
        screen: 'communication.GroupSettings',
        animated: true,
      });
    } else {
      navigator.push({
        screen: 'communication.ConversationSettings',
        animated: true,
      });
    }

    this.onRemove();
  }

  onSwitchNotificationSetting() {
    const { communication } = this.props;
    if (communication.selectedConversation.isGroup) return;

    const { messengerInfo, selectedConversationId } = communication;
    const notifOn = messengerInfo.byId(selectedConversationId).notification;
    communication.changeConvNotificationProp(!notifOn);
  }

  hideSettingsPopup(cb: () => void) {
    Animated.timing(this.state.animValue, {
      toValue: INIT_TOP,
      duration: 200,
    }).start(() => {
      if (cb) cb();
    });
  }

  render() {
    const { communication, style } = this.props;
    const { messengerInfo, selectedConversationId } = communication;
    const { animValue } = this.state;

    const notifOn = messengerInfo.byId(selectedConversationId).notification;

    return (
      <Animated.View
        style={[styles.container, style, { top: animValue }]}
      >
        <IconButton
          onPress={::this.onSearchMessages}
          source="icon-search-16"
          title="Search"
        />

        {!communication.selectedConversation.isGroup && (
          <IconButton
            iconStyle={notifOn ? null : styles.iconOff}
            titleStyle={notifOn ? null : styles.iconOff}
            onPress={::this.onSwitchNotificationSetting}
            source={notifOn ? 'fa-bell' : 'fa-bell-slash'}
            title="Mute"
          />
        )}

        <IconButton
          onPress={::this.onSendOffer}
          source={'icon-plus-24'}
          title="Offer"
        />

        <IconButton
          onPress={::this.onUserInfoPress}
          source={'fa-info-circle'}
          title="Info"
        />
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 55,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    backgroundColor: '#FFF',
    borderBottomColor: '$pe_color_apple_div',
    borderBottomWidth: 1,
    zIndex: 10,
  },

  iconOff: {
    color: '$pe_color_icon',
  },
});