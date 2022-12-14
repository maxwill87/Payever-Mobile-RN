import { Component } from 'react';
import { Keyboard } from 'react-native';
import { observer, inject } from 'mobx-react/native';
import {
  Button, Container, Error, Loader, NavBar, StyleSheet, TextInput, View,
} from 'ui';
import type { Navigator } from 'react-native-navigation';

import type AuthStore from '../../../store/auth';

@inject('auth', 'config')
@observer
export default class Login extends Component {
  static navigatorStyle = {
    navBarHidden: true,
  };

  props: {
    auth: AuthStore;
    navigator: Navigator;
  };

  $usernameInput: TextInput;
  $password: TextInput;

  state: {
    username: string;
    password: string;
  };

  constructor(props) {
    super(props);

    this.state = {
      username: '',
      password: '',
    };
  }

  componentDidMount() {
    // To avoid blinking when keyboard and screen animation
    // go simultaneously
    setTimeout(() => {
      if (this.$usernameInput) {
        this.$usernameInput.focus();
      }
    }, 550);
  }

  async onSignIn() {
    const { auth, navigator } = this.props;
    const { password, username } = this.state;

    this.setState({ password: '' });

    if (password.length < 3 || username === '') {
      auth.setError('E-mail and password can\'t be empty!');
      return;
    }

    const signInResult = await auth.signIn(username, password);

    if (signInResult) {
      //noinspection JSUnresolvedFunction
      Keyboard.dismiss();
      navigator.resetTo({ screen: 'dashboard.ChooseAccount' });
    }
  }

  onForgotPassword() {
    const { navigator } = this.props;
    navigator.push({ screen: 'auth.ResetPassword', animated: true });
  }

  render() {
    const { isLoading, error } = this.props.auth;
    const { username, password } = this.state;

    return (
      <View style={styles.container}>
        <NavBar>
          <NavBar.Back title="Back" showTitle="always" />
          <NavBar.Title title="Login" />
          <NavBar.Button
            title="Forgot Password?"
            onPress={::this.onForgotPassword}
          />
        </NavBar>
        <Loader isLoading={isLoading}>
          <Container contentContainerStyle={styles.form} layout="small">
            <Error
              onShowEnd={() => this.props.auth.setError('')}
              duration={5000}
              message={error}
            />
            <View>
              <TextInput
                ref={ref => this.$usernameInput = ref}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                label="Your e-mail"
                onChangeText={text => this.setState({ username: text })}
                onSubmitEditing={() => this.$password.focus()}
                returnKeyType="next"
                value={username}
              />
            </View>
            <View>
              <TextInput
                ref={ref => this.$password = ref}
                label="Your password"
                secureTextEntry
                returnKeyType="send"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={text => this.setState({ password: text })}
                onSubmitEditing={::this.onSignIn}
              />
            </View>
            <View style={styles.submitContainer}>
              <Button
                animated
                disabled={username === '' || password.length < 3}
                title="Sign In"
                onPress={::this.onSignIn}
              />
            </View>
          </Container>
        </Loader>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1,
  },

  header: {
    justifyContent: 'flex-start',
  },

  form: {
    flexDirection: 'column',
    marginTop: '10%',
  },

  submitContainer: {
    marginTop: 20,
  },
});