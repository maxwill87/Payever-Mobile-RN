import { Component } from 'react';
import { Image } from 'react-native';
import { inject, observer } from 'mobx-react/native';
import { Html, StyleSheet, Text, View } from 'ui';
import { format } from 'utils';
import type Offer, { OfferItem }
from '../../../../store/CommunicationStore/models/Offer';

@inject('config')
@observer
// eslint-disable-next-line react/prefer-stateless-function
export default class OfferView extends Component {
  props: {
    offer: Offer;
  };

  render() {
    const offer = this.props.offer;
    const description = offer.description;
    const items = offer.marketing_channel_set.store.items;

    return (
      <View>
        <Html source={description} />
        {items.map(item => <OfferItemView key={item.id} item={item} />)}
      </View>
    );
  }
}

function OfferItemView({ item }: { item: OfferItem }) {
  const imageUri = item.thumbnail;

  const prices = item.positions.map(p => p.price);
  const min = format.currency(Math.min(...prices));
  const max = format.currency(Math.max(...prices));
  const price = min === max ? min : `${min} - ${max}`;

  return (
    <View style={styles.item}>
      <Image style={styles.item_image} source={{ uri: imageUri }} />
      <Text style={styles.item_name}>{item.name}</Text>
      <Text style={styles.item_price}>{price}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  item: {
    marginTop: 20,
  },

  item_image: {
    height: 150,
    resizeMode: 'contain',
  },

  item_name: {
    fontSize: 15,
    paddingTop: 10,
    textAlign: 'center',
  },

  item_price: {
    color: '$pe_color_gray_2',
    fontSize: 14,
    paddingTop: 2,
    textAlign: 'center',
  },
});