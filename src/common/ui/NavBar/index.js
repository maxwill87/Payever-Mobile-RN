import { Children, Component, PropTypes } from 'react';
import { Image, View } from 'react-native';
import StyleSheet from '../StyleSheet';
import AvatarButton from './AvatarButton';
import Back from './Back';
import Button from './Button';
import IconButton from './IconButton';
import Menu from './Menu';
import Title from './Title';
import ComplexTitle from './ComplexTitle';
import SearchItem from './SearchItem';

//noinspection JSUnresolvedVariable
import bgGradient from './images/gradient.png';

export default class NavBar extends Component {
  static Avatar     = AvatarButton;
  static Back       = Back;
  static Button     = Button;
  static Default    = Default;
  static IconButton = IconButton;
  static Menu       = Menu;
  static Title      = Title;
  static Search     = SearchItem;

  static ComplexTitle = ComplexTitle;

  static childContextTypes = {
    popup: PropTypes.bool,
  };

  static defaultProps = {
    popup: false,
    transparent: false,
  };

  props: {
    children?: Array;
    /**
     * Apply popup styles to NavBar
     */
      popup?: boolean;
    style?: Object | number;
    transparent?: boolean;
  };

  getChildContext() {
    return {
      popup: this.props.popup,
    };
  }

  render() {
    const { style, popup, transparent } = this.props;
    const children = Children.toArray(this.props.children);

    const containerStyle = [styles.container];
    if (popup) {
      containerStyle.push(styles.container_popup);
    }

    if (transparent) {
      containerStyle.push(styles.container_transparent);
    }

    const leftStyle = popup ? styles.leftZone_popup : null;

    return (
      <View style={[containerStyle, style]}>
        <View style={[styles.leftZone, leftStyle]}>
          {children.filter(filterByAlign('left'))}
        </View>
        <View style={styles.centerZone}>
          {children.filter(filterByAlign('center'))}
        </View>
        <Image
          style={styles.rightZone}
          source={transparent ? null : bgGradient}
        >
          {children.filter(filterByRightAlign())}
        </Image>
      </View>
    );
  }
}

function Default({ title, source }: DefaultNavBarProps) {
  return (
    <NavBar>
      <NavBar.Back />
      <NavBar.Title source={source} title={title} />
      <NavBar.Menu />
    </NavBar>
  );
}

function filterByAlign(align) {
  return ({ props }) => props.align === align;
}

/**
 * Align=right by default. In some cases we can't easily set an align property.
 * For example, when we wrap a component into decorator.
 * @return {function({props: Object}): boolean}
 */
function filterByRightAlign() {
  return ({ props }) => props.align !== 'left' && props.align !== 'center';
}

const styles = StyleSheet.create({
  $padding: 18,
  $paddingPopup: 9,

  container: {
    alignItems: 'center',
    borderBottomColor: '$pe_color_light_gray_1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 55,
    justifyContent: 'flex-end',
    paddingHorizontal: '$padding',
    '@media ios': {
      marginTop: 15,
      zIndex: 1000,
    },
    backgroundColor: '#FFF',
    elevation: 8,
  },

  container_popup: {
    paddingHorizontal: '$paddingPopup',
  },

  container_transparent: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
    borderBottomWidth: 0,
  },

  leftZone: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    left: '$padding',
    position: 'absolute',
    top: 0,
    '@media ios': {
      zIndex: 1002,
    },
  },

  leftZone_popup: {
    left: '$paddingPopup',
  },

  centerZone: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    '@media ios': {
      zIndex: 1001,
    },
  },

  rightZone: {
    alignItems: 'center',
    flexDirection: 'row',
    width: null,
    height: null,
    justifyContent: 'flex-end',
    paddingLeft: 20,
    resizeMode: 'stretch',
    zIndex: 1002,
  },
});

type DefaultNavBarProps = {
  source?: Object | string | number;
  title?: string;
};