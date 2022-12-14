import {
  action, autorun, computed, extendObservable, observable, ObservableMap,
} from 'mobx';
import { apiHelper, log, soundHelper } from 'utils';
import { throttle } from 'lodash';

import UserSettings from './models/UserSettings';
import MessengerInfo from './models/MessengerInfo';
import Contact from './models/Contact';
import Conversation, { ConversationStatus }
  from './models/Conversation';
import ConversationSettingsData from './models/ConversationSettingsInfo';
import GroupSettingsData from './models/GroupSettingsInfo';
import { MessengerData } from '../../common/api/MessengerApi';
import SocketHandlers from './SocketHandlers';
import Message from './models/Message';
import CommunicationUI from './ui';
import Group from './models/Group';
import ChatMessagesProcState from './ChatMessagesProcState';
import type SocketApi from '../../common/api/MessengerApi/SocketApi';
import type ConversationInfo from './models/ConversationInfo';
import type BusinessProfile from '../profiles/models/BusinessProfile';
import type GroupMemberInfo from './models/GroupMemberInfo';
import type Store from '../index';

const MSGS_REQUEST_LIMIT = 30;

export default class CommunicationStore {
  @observable conversations: ObservableMap<Conversation> = observable.map();
  @observable messengerInfo: MessengerInfo = {
    conversations: [],
    groups: [],
    marketingGroups: [],
  };

  @observable isLoading: boolean = false;
  @observable error: string = '';

  // Additional loading object for settings because it loads in parallel
  @observable settingsLoading: SettingsLoadingObject = {
    isLoading: false,
    error: '',
  };

  @observable selectedConversationId: number;

  @observable foundMessages: Array<Message> = [];
  @observable contactsFilter: string = '';

  @observable selectedMessages: Array<Message> = [];

  @observable contactsAutocomplete: Array = [];
  @observable contactsForAction: Array<Contact> = [];

  @observable messageForReply: Message = null;
  @observable messageForEdit: Message = null;

  @observable filesUploadingProgress: ObservableMap<number> = observable.map();

  // UI
  @observable ui: CommunicationUI = {};

  // Chat messages state
  chatMessagesState: ChatMessagesProcState = null;

  store: Store;
  socket: SocketApi;
  socketHandlers: SocketHandlers;
  socketObserver: Function;

  constructor(store: Store) {
    this.store = store;
    this.socketHandlers = new SocketHandlers(this);

    // Allow to send typingStatus only once per 5sec
    this.updateTypingStatus = this::throttle(this.updateTypingStatus, 5000);
    this.ui = new CommunicationUI();

    this.chatMessagesState = new ChatMessagesProcState(this, this.ui);
    this.chatMessagesState.initState();
  }

  @computed get isError() {
    return this.error !== '';
  }

  @computed
  get conversationsCount() {
    const { conversations, groups } = this.messengerInfo;
    return conversations.length + groups.length + this.foundMessages.length;
  }

  @action
  async loadMessengerInfo(profile: BusinessProfile) {
    if (!profile) return null;
    const { messenger } = this.store.api;

    let apiEndPoint;
    if (profile.isBusiness) {
      apiEndPoint =
        messenger.getBusiness.bind(messenger, profile.business.slug);
    } else {
      apiEndPoint = messenger.getPrivate.bind(messenger);
    }

    return apiHelper(apiEndPoint, this)
      .cache(`communication:messengerInfo:${profile.id}`)
      .success((data: MessengerData) => {
        this.initSocket(data.wsUrl, data.messengerUser.id);
        this.messengerInfo = new MessengerInfo(data);

        if (!this.store.ui.phoneMode && !this.selectedConversationId) {
          const conversation = this.messengerInfo.getDefaultConversation();
          this.setSelectedConversationId(conversation.id);
        }

        return this.messengerInfo;
      })
      .error(log.error)
      .promise();
  }

  @action
  async loadConversation(id: number, limit: number = MSGS_REQUEST_LIMIT) {
    const { api } = this.store;
    let socket = api.messenger.socket;
    try {
      socket = await api.messenger.getSocket();
    } catch (err) {
      log.error(err);
    }

    if (!socket || id === null || id === undefined) return null;

    const userId = socket.userId;
    const type = this.messengerInfo.getConversationType(id);

    return apiHelper(
      socket.getConversation.bind(socket, { id, type, limit }),
      this
    ).cache(`communication:conversations:${userId}:${id}`)
      .success(async (data) => {
        const conversation = new Conversation(
          data,
          this.messengerInfo.byId(id)
        );

        conversation.allMessagesFetched = data.messages.length < limit;

        // Load settings synchroniously for groups course it using data from
        // setting to display header and async for conversation
        try {
          let settings;
          if (conversation.isGroup) {
            settings = await this.getGroupSettings(id, conversation.type);
            conversation.setConversationSettings(settings);
          }
        } catch (err) {
          log.error(err);
        }

        this.conversations.merge({ [id]: observable(conversation) });
        return conversation;
      })
      .error(log.error)
      .promise();
  }

  @action
  async loadOlderMessages(id: number) {
    const conversation = this.conversations.get(id);
    if (!conversation) return null;

    if (conversation.allMessagesFetched || this.isLoading) {
      return null;
    }

    const newMsgsLimit = conversation.messages.length + MSGS_REQUEST_LIMIT;
    return await this.loadConversation(id, newMsgsLimit);
  }

  @action
  async setSelectedConversationId(id) {
    this.selectedConversationId = id;
    if (id) {
      let conversation = this.conversations.get(id);
      if (!conversation) {
        //noinspection JSIgnoredPromiseFromCall
        conversation = await this.loadConversation(id);
      }

      if (conversation) {
        await this.markConversationAsRead(id);
      }
    }
  }

  @action
  async markConversationAsRead(id) {
    if (!id) return;
    const conversation: Conversation = this.conversations.get(id);
    const unreadIds = conversation.getUnreadIds();
    if (conversation) {
      conversation.messages.forEach(m => m.unread = false);
    }

    if (this.messengerInfo) {
      const info = this.messengerInfo.byId(id);
      if (info) {
        info.unreadCount = 0;
      }
    }

    if (unreadIds.length > 0) {
      const socket = await this.store.api.messenger.getSocket();
      await apiHelper(socket.updateMessagesReadStatus.bind(socket, unreadIds))
        .error(log.error)
        .promise();
    }
  }

  @action
  async search(text) {
    this.contactsFilter = text || '';

    if (!text) {
      this.foundMessages = [];
      return;
    }

    //noinspection JSIgnoredPromiseFromCall
    await this.searchMessages(this.contactsFilter.toLowerCase());
  }

  @action
  searchContactsAutocomplete(query) {
    if (!query || query === '') return null;

    const { api: { messenger } } = this.store;
    const { messengerUser } = this.messengerInfo;

    if (!messengerUser) return null;

    return apiHelper(
      messenger.getAvailableContacts.bind(messenger, messengerUser.id, query),
      this
    ).success((data) => {
      this.contactsAutocomplete = data;
    }).error(log.error)
    .promise();
  }

  @action
  getContactData(contactId: number) {
    if (!contactId) return null;

    const { api: { messenger } } = this.store;
    return apiHelper(messenger.getContactData.bind(messenger, contactId))
      .success(data => data)
      .promise();
  }

  @action
  async sendMessage(conversationId, body, channelSetId = '') {
    this.addSendingMessage(body);

    const socket = await this.store.api.messenger.getSocket();
    if (!socket) return null;

    const options = {
      conversationId,
      body,
      channelSetId,
    };

    if (this.messageForReply) {
      options.replyToId = this.messageForReply.id;
    }

    const { settings } = this.selectedConversation;
    if (settings && settings.notification) {
      soundHelper.playMsgSent();
    }

    this.chatMessagesState.initState();

    return socket.sendMessage(options);
  }

  @action
  async sendMessageWithMedias(
    body,
    mediaFileInfo,
    conversationId = this.selectedConversationId
  ) {
    const { messengerUser } = this.messengerInfo;
    if (!messengerUser) return;

    const { settings } = this.selectedConversation;
    if (settings && settings.notification) {
      soundHelper.playMsgSent();
    }

    const uploadMessage = {
      id: String(Date.now()),
      fileName: mediaFileInfo.fileName,
      uri: mediaFileInfo.uri,
      path: mediaFileInfo.path,
      isFileUploading: true,
      width: mediaFileInfo.width,
      height: mediaFileInfo.height,
      fileSize: mediaFileInfo.fileSize,
      isPicture: mediaFileInfo.isPicture,
    };

    this.selectedConversation.addMessage(uploadMessage);

    this.filesUploadingProgress.set(uploadMessage.id, 0);

    await this.store.api.messenger.sendMessageWithMedias(
      messengerUser.id,
      conversationId,
      body,
      {
        ...mediaFileInfo,
        uploadProgressKey: uploadMessage.id,
      },
      this.updateFileUploadProgress.bind(this)
    ).catch(log.error);
  }

  @action
  addSendingMessage(body) {
    if (!this.selectedConversation) return;
    const sendMessage = {
      body,
      messengerUser: this.messengerInfo.messengerUser,
      id: String(Date.now()),
      conversationId: this.selectedConversationId,
      date: new Date(),
      isSendingMessage: true,
    };

    this.selectedConversation.addMessage(sendMessage);
  }

  @action
  updateFileUploadProgress(progressId: string, value: number) {
    const key = progressId;
    if (this.filesUploadingProgress.has(key)) {
      if (value >= 100) {
        this.filesUploadingProgress.set(key, 100);
      } else {
        this.filesUploadingProgress.set(key, value);
      }
    }
  }

  @action
  removeFileUploadingProgress(progressId: string) {
    this.filesUploadingProgress.delete(progressId);
  }

  @action
  async searchMessages(query) {
    const socket = await this.store.api.messenger.getSocket();
    return apiHelper(socket.searchMessages.bind(socket, query))
      .success((data) => {
        const messages = data.messages || [];
        this.foundMessages = messages.map(m => new Message(m));
        return this.foundMessages;
      })
      .promise();
  }

  @action
  clearFoundMessages() {
    this.foundMessages = [];
  }

  @action
  setMessageForReply(message: Message) {
    if (!message) return;
    this.messageForReply = message;
    this.chatMessagesState.replyState();
  }

  @action
  removeMessageForReply() {
    this.messageForReply = null;
  }

  @action
  setMessageForEdit(message: Message) {
    if (!message) return;
    this.messageForEdit = message;
    this.chatMessagesState.editState();
  }

  @action
  removeMessageForEdit() {
    this.messageForEdit = null;
  }

  @action
  saveUserSettings(settings: UserSettings) {
    if (!settings) return;

    const { api: { messenger } } = this.store;
    const { messengerUser } = this.messengerInfo;

    apiHelper(
      messenger.saveSettings.bind(messenger, messengerUser.id, settings)
    ).success(() => {
      const userSettings = new UserSettings(settings);
      soundHelper.setUserSettings(userSettings);
      extendObservable(this.messengerInfo, { userSettings });
    }).error(log.error);
  }

  @action
  async updateTypingStatus(conversationId) {
    const socket = await this.store.api.messenger.getSocket();
    return await socket.updateTypingStatus(conversationId);
  }

  getContactsAndGroupsData() {
    const filter = this.contactsFilter;
    const info = this.messengerInfo;

    let contacts = info ? info.conversations.slice() : [];
    let groups   = info ? info.groups.slice() : [];
    const foundMessages = this.foundMessages.slice();

    if (filter) {
      contacts = contacts.filter(c => c.name.toLowerCase().includes(filter));
      groups = groups.filter(c => c.name.toLowerCase().includes(filter));
    }

    return [{
      data: contacts,
      title: 'contacts',
      key: '1',
    }, {
      data: groups,
      title: 'groups',
      key: '2',
    }, {
      data: foundMessages,
      title: 'foundMessages',
      key: '3',
    }];
  }

  @computed
  get selectedConversation(): Conversation {
    return this.conversations.get(this.selectedConversationId);
  }

  @action
  updateUserStatus(status: ConversationStatus, typing = false) {
    this.conversations.forEach((conversation: Conversation) => {
      if (!conversation || !conversation.status) return;
      if (conversation.status.userId !== status.userId) return;

      conversation.updateStatus(status, typing);
    });

    this.messengerInfo.conversations.forEach((info: ConversationInfo) => {
      if (info.status.userId !== status.userId) return;
      info.updateStatus(status);
    });
  }

  @action
  async updateMessage(message: Message) {
    const conversationId = message.conversation.id;

    // Update a conversation if it's opened
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.updateMessage(message);
    }

    const info = this.messengerInfo.byId(conversationId);

    // Reload messengerInfo if it's new conversation
    if (!info) {
      //noinspection JSIgnoredPromiseFromCall
      await this.loadMessengerInfo(this.store.profiles.currentProfile);
      return;
    }

    if (message.unread) {
      if (message.conversation.id === this.selectedConversationId
        && this.ui.chatScreenOpen) {
        const socket = await this.store.api.messenger.getSocket();
        await apiHelper(
          socket.updateMessagesReadStatus.bind(socket, [message.id])
        ).error(log.error)
          .promise();
        message.unread = false;
      } else {
        info.unreadCount = +info.unreadCount + 1;
        log.info('Increase count', info);
      }
    }
  }

  @action
  async forwardMessage(forwardFromId) {
    const socket = await this.store.api.messenger.getSocket();
    return socket.sendMessage({
      forwardFromId,
      conversationId: this.selectedConversationId,
    });
  }

  @action
  forwardSelectedMessages() {
    this.selectedMessages.forEach(async (m) => {
      await this.forwardMessage(m.id);
    });

    this.chatMessagesState.initState();
  }

  @action
  async deleteMessage(messageId) {
    const socket = await this.store.api.messenger.getSocket();
    if (this.messageForEdit && this.messageForEdit.id === messageId) {
      this.messageForEdit = null;
    }

    if (this.messageForReply && this.messageForReply.id === messageId) {
      this.messageForReply = null;
    }

    if (this.selectedMessages.find(m => m.id === messageId)) {
      this.selectedMessages = this.selectedMessages.filter(
        m => m.id !== messageId
      );
    }

    return socket.deleteMessage(messageId);
  }

  @action
  deleteSelectedMessages() {
    this.selectedMessages.forEach(async (m) => {
      if (!m.deleted && m.deletable) {
        await this.deleteMessage(m.id);
      }
    });

    this.chatMessagesState.initState();
  }

  @action
  deleteAllMsgsInSelectConversation() {
    this.selectedConversation.messages.forEach(async (m) => {
      if (!m.deleted && m.deletable) {
        await this.deleteMessage(m.id);
      }
    });

    this.chatMessagesState.initState();
  }

  @action
  async editMessage(id, newValue) {
    const socket = await this.store.api.messenger.getSocket();

    return socket.editMessage({ id, newValue });
  }

  @action
  selectMessage(message: Message) {
    if (this.checkMessageSelected(message.id)) return;

    extendObservable(this, {
      selectedMessages: this.selectedMessages.concat(message),
    });
  }

  @action
  deselectMessage(messageId: number) {
    extendObservable(this, {
      selectedMessages: this.selectedMessages.filter(m => m.id !== messageId),
    });
  }

  @action
  clearSelectedMessages() {
    extendObservable(this, {
      selectedMessages: [],
    });
  }

  @action
  checkMessageSelected(messageId: number) {
    return !!this.selectedMessages.find(m => m.id === messageId);
  }

  @action
  addContactForAction(contact: Contact) {
    if (this.checkContactAddedForAction(contact.id)) return;

    this.contactsForAction.push(contact);
  }

  @action
  removeContactForAction(contactId: string) {
    this.contactsForAction =
      this.contactsForAction.filter(contact => contact.id !== contactId);
  }

  @action
  checkContactAddedForAction(contactId: number) {
    // savedId - it's id which might be manually added when converting
    // saved contact to general contact (getContactData - gets general data
    // for contact by savedContact Id
    return !!this.contactsForAction.find(
      contact => contact.id === contactId || contact.savedId === contactId
    );
  }

  @action
  clearContactsForAction() {
    this.contactsForAction = [];
  }

  @action
  clearAtocomleteContactsSearch() {
    this.contactsAutocomplete = [];
  }

  @action
  createNewGroup(groupName: string, isAllowGroupChat: boolean) {
    const { api: { messenger }, contacts } = this.store;
    const { messengerUser } = this.messengerInfo;

    let recipients = this.contactsForAction.slice()
      .reduce((result, contact, index, allContacts) => {
        return result + contact.id +
          (allContacts.length - 1 !== index ? ',' : '');
      }, '');


    // Add recipients from contacts
    const userContacts = contacts.selectedContacts.slice();
    recipients = userContacts.reduce((result, contact, index) => {
      return result + `contact-${contact.id}` +
        (userContacts.length - 1 !== index ? ',' : '');
    }, recipients + (userContacts.length === 0 ? '' : ','));

    apiHelper(
      messenger.createNewGroup.bind(
        messenger,
        messengerUser.id,
        groupName,
        recipients,
        isAllowGroupChat
      ),
      this
    ).success()
      .complete(() => {
        this.clearContactsForAction();
        contacts.clearSelectedContacts();
      });
  }

  @action
  getGroupInfo(id) {
    const { messenger } = this.store.api;

    return apiHelper(
      messenger.getGroupInfo.bind(messenger, id),
      this.settingsLoading
    ).success(data => new Group(data))
      .promise();
  }

  @action
  async getConversationSettings(id) {
    const socket = await this.store.api.messenger.getSocket();

    return apiHelper(
      socket.getConversationSettings.bind(socket, id),
      this.settingsLoading
    ).success(data => new ConversationSettingsData(data))
      .promise();
  }

  @action
  async changeConvNotificationProp(state) {
    const socket = await this.store.api.messenger.getSocket();

    apiHelper(socket.changeConvNotificationProp.bind(
      socket, this.selectedConversationId, state
    )).success();

    this.selectedConversation.setNotificationSetting(state);
    const convInfo = this.messengerInfo.byId(this.selectedConversationId);
    if (convInfo) {
      convInfo.notification = state;
    }
  }

  @action
  async getChatGroupSettings(groupId: number) {
    const socket = await this.store.api.messenger.getSocket();
    return apiHelper(
      socket.getChatGroupSettings.bind(socket, groupId),
      this.settingsLoading
    ).success(data => data)
      .promise();
  }

  @action
  async getMarketingGroupSettings(groupId: number) {
    const socket = await this.store.api.messenger.getSocket();
    return apiHelper(
      socket.getMarketingGroupSettings.bind(socket, groupId),
      this.settingsLoading
    ).success(data => data)
      .promise();
  }

  @action
  async getGroupSettings(groupId, type: 'chat-group' | 'marketing-group') {
    let currentGroupSettings = null;
    if (type === 'chat-group') {
      currentGroupSettings = await this.getChatGroupSettings(groupId);
    } else if (type === 'marketing-group') {
      currentGroupSettings = await this.getMarketingGroupSettings(groupId);
    }

    return new GroupSettingsData(currentGroupSettings);
  }

  @action
  async removeGroupMember(groupId: number, memberId: number) {
    const socket = await this.store.api.messenger.getSocket();

    apiHelper(socket.removeGroupMember.bind(socket, groupId, memberId))
      .success(() => {
        this.selectedConversation.removeMember(memberId);
        this.markConversationAsRead(this.selectedConversationId);
      })
      .error(log.error);
  }

  @action
  async addGroupMember(groupId: number, memberAlias: string) {
    const socket = await this.store.api.messenger.getSocket();
    return apiHelper(socket.addGroupMember.bind(socket, groupId, memberAlias))
      .success((data) => {
        this.selectedConversation.addMember(data);

        // Mark conversation as read to avoid badge appearance
        this.markConversationAsRead(this.selectedConversationId);
      })
      .promise();
  }

  @action
  addAllMembersToGroup(groupId: number) {
    const contacts = this.store.contacts.selectedContacts.slice().map((m) => {
      m.id = `contact-${m.id}`;
      return m;
    });

    const members = contacts.concat(this.contactsForAction.slice());
    members.forEach(async (member: GroupMemberInfo) => {
      await this.addGroupMember(groupId, member.id);
    });
  }

  @action
  async deleteGroup(groupId: number) {
    const socket = await this.store.api.messenger.getSocket();

    return apiHelper(socket.deleteGroup.bind(socket, groupId))
      .success(() => {
        // Remove group locally
        const { groups } = this.messengerInfo;
        const delGroupIndex = groups.findIndex(group => group.id === groupId);

        // Find new group to display
        let newIndex = -1;
        if (groups.length > 1) {
          newIndex = delGroupIndex > 0 ? delGroupIndex - 1 : delGroupIndex + 1;
        }

        if (newIndex !== -1) {
          this.setSelectedConversationId(groups[newIndex].id);
        } else {
          this.setSelectedConversationId(null);
        }

        this.messengerInfo.groups = groups.filter(
          group => group.id !== groupId
        );
      })
      .error(log.error)
      .promise();
  }

  @action
  sendInviteMsgToContacts(message: string) {
    const { api, contacts, profiles } = this.store;
    const userContacts = contacts.selectedContacts.slice()
      .map((m) => {
        m.id = `contact-${m.id}`;
        return m;
      });

    const recipients = userContacts.concat(this.contactsForAction.slice())
      .reduce((result, contact, index, allContacts) => {
        return result + contact.id +
          (allContacts.length - 1 !== index ? ',' : '');
      }, '');

    const { messengerUser } = this.messengerInfo;

    apiHelper(api.messenger.sendMessage.bind(
      api.messenger,
      messengerUser.id,
      recipients,
      message
    )).success(() => {
      this.clearAtocomleteContactsSearch();
      contacts.clearSelectedContacts();
      this.loadMessengerInfo(profiles.currentProfile);
    });
  }

  @action
  sendMsgToMarketingGroup(groupRecipientId, message: string) {
    const { messenger } = this.store.api;
    const { messengerUser } = this.messengerInfo;

    apiHelper(messenger.sendMessage.bind(
      messenger,
      messengerUser.id,
      groupRecipientId,
      message
    )).success();
  }

  initSocket(url, userId) {
    const { api, auth } = this.store;

    if (this.socket && this.socket.userId === userId) {
      return;
    }

    this.socket = api.messenger.connectToWebSocket(
      url,
      userId,
      auth.getAccessToken()
    );

    this.socketHandlers.subscribe(this.socket);

    if (this.socketObserver) {
      this.socketObserver();
    }

    this.socketObserver = autorun(() => {
      this.socket.setAccessToken(auth.getAccessToken());
    });
  }
}

type SettingsLoadingObject = {
  isLoading: boolean;
  error: string;
};