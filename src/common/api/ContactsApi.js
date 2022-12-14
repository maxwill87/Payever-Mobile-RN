import RNFetchBlob from 'react-native-fetch-blob';
import type PayeverApi from './index';
import CustomerContactInfo
  from '../../store/contacts/models/CustomerContactInfo';
import config from '../../config';

export default class ContactsApi {
  client: PayeverApi;

  constructor(client: PayeverApi) {
    this.client = client;
  }

  getAllContacts(businessId, page): Promise<UserContactsResp> {
    return this.client.get(
      `/api/rest/v1/contact/business/${businessId}`,
      { page }
    );
  }

  getAllContactGroups(businessId, page: number): Promise<ContactGroupsResp> {
    return this.client.get(
      `/api/rest/v1/contact-group/business/${businessId}`,
      { page }
    );
  }

  getGroupDetails(groupId: number): Promise<GroupDetailsResp> {
    return this.client.get(`/api/rest/v1/contact-group/${groupId}`);
  }

  createNewContact(
    contact: CustomerContactInfo,
    slug: string
  ): Promise<CustomerContactResp> {
    return this.client.post(
      `/api/rest/v1/contact/business/${slug}`,
      { contact }
    );
  }

  sendInviteMessage(contactIds: Array<number>): Promise<ApiResp> {
    return this.client.post('/api/rest/v1/contact/invite', { contactIds });
  }

  async uploadContactLogo(
    media: Object,
    progressCb: (progress: number) => void
  ): Promise<ApiResp> {
    return RNFetchBlob.fetch(
      'POST',
      config.siteUrl + '/api/rest/v1/contact/avatar/upload',
      {
        Authorization: 'Bearer ' + await this.client.authStore.getAccessToken(),
        'Content-Type': 'application/octet-stream',
      },
      [
        {
          name: 'file',
          filename: media.fileName,
          data: media.data,
        },
      ]
    ).uploadProgress((written, total) => {
      if (progressCb) {
        // I add 1.97 koef for encoding to 64 bits as i understand how it works
        progressCb(1.97 * 100 * (written / total));
      }
    });
  }
}

declare class UserContactsResp extends ApiResp {
  pagination_data: ContactsPaginationData;
  contact_models: Array<CustomerContactData>;
}

declare class CustomerContactResp extends ApiResp {
  data: CustomerContactData;
}

declare class ContactGroupsResp extends ApiResp {
  pagination_data: ContactsPaginationData;
  contact_models: Array<ContactGroupData>;
}

declare class GroupDetailsResp extends ApiResp {
  data: GroupDetailsData;
}

export type ContactsPaginationData = {
  last: number;
  current: string;
  numItemsPerPage: number;
  first: number;
  pageCount: number;
  totalCount: number;
  pageRange: number;
  startPage: number;
  endPage: number;
  pagesInRange: Array<number>;
  firstPageInRange: number;
  lastPageInRange: number;
  currentItemCount: number;
  firstItemNumber: number;
  lastItemNumber: number;
};

export type CustomerContactData = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  country: ?string;
  city: ?string;
  zip_code: ?string;
  street: ?string;
  phone: ?string;
  total_spent: number;
  avatar_url: ?string;
  payment_types: Array<any>;
  channels: Array<any>;
  last_purchase: ?number;
  count_purchases: number;
  birthday: ?string;
  country_name: ?string;
  invitation_date: ?string;
  invitation_available: boolean;
  registered: boolean;
  last_active: string;
};

export type ContactGroupData = {
  id: number;
  name: string;
  contacts_count: number;
  logo_url: string;
};

export type GroupDetailsData = {
  id: number;
  name: string;
  filters?: string;
  contact_models: Array<CustomerContactData>;
  logo_url?: string;
  total_spent: number;
  count_purchases: number;
  orders_count: number;
};