import History from './utils/History';
import Pane from './utils/Pane';
import ReplyComposer from './components/ReplyComposer';
import DiscussionPage from './components/DiscussionPage';
import SignUpModal from './components/SignUpModal';
import HeaderPrimary from './components/HeaderPrimary';
import HeaderSecondary from './components/HeaderSecondary';
import Composer from './components/Composer';
import DiscussionRenamedNotification from './components/DiscussionRenamedNotification';
import CommentPost from './components/CommentPost';
import DiscussionRenamedPost from './components/DiscussionRenamedPost';
import routes from './routes';
import alertEmailConfirmation from './utils/alertEmailConfirmation';
import Application from '../common/Application';
import Navigation from '../common/components/Navigation';
import NotificationListState from './states/NotificationListState';
import GlobalSearchState from './states/GlobalSearchState';
import DiscussionListState from './states/DiscussionListState';

export default class ForumApplication extends Application {
  /**
   * A map of notification types to their components.
   *
   * @type {Object}
   */
  notificationComponents = {
    discussionRenamed: DiscussionRenamedNotification,
  };
  /**
   * A map of post types to their components.
   *
   * @type {Object}
   */
  postComponents = {
    comment: CommentPost,
    discussionRenamed: DiscussionRenamedPost,
  };

  /**
   * An object which controls the state of the page's side pane.
   *
   * @type {Pane}
   */
  pane = null;

  /**
   * An object which controls the state of the page's drawer.
   *
   * @type {Drawer}
   */
  drawer = null;

  /**
   * The app's history stack, which keeps track of which routes the user visits
   * so that they can easily navigate back to the previous route.
   *
   * @type {History}
   */
  history = new History();

  /**
   * An object which controls the state of the user's notifications.
   *
   * @type {NotificationListState}
   */
  notifications = new NotificationListState(this);

  /*
   * An object which stores previously searched queries and provides convenient
   * tools for retrieving and managing search values.
   *
   * @type {GlobalSearchState}
   */
  search = new GlobalSearchState();

  constructor() {
    super();

    routes(this);

    /**
     * An object which controls the state of the cached discussion list, which
     * is used in the index page and the slideout pane.
     *
     * @type {DiscussionListState}
     */
    this.discussions = new DiscussionListState({ forumApp: this });

    /**
     * @deprecated beta 14, remove in beta 15.
     */
    this.cache.discussionList = this.discussions;
  }

  /**
   * @inheritdoc
   */
  mount() {
    // Get the configured default route and update that route's path to be '/'.
    // Push the homepage as the first route, so that the user will always be
    // able to click on the 'back' button to go home, regardless of which page
    // they started on.
    const defaultRoute = this.forum.attribute('defaultRoute');
    let defaultAction = 'index';

    for (const i in this.routes) {
      if (this.routes[i].path === defaultRoute) defaultAction = i;
    }

    this.routes[defaultAction].path = '/';
    this.history.push(defaultAction, this.translator.trans('core.forum.header.back_to_index_tooltip'), '/');

    m.mount(document.getElementById('app-navigation'), Navigation.component({ className: 'App-backControl', drawer: true }));
    m.mount(document.getElementById('header-navigation'), Navigation.component());
    m.mount(document.getElementById('header-primary'), HeaderPrimary.component());
    m.mount(document.getElementById('header-secondary'), HeaderSecondary.component());

    this.pane = new Pane(document.getElementById('app'));
    this.composer = m.mount(document.getElementById('composer'), Composer.component());

    m.route.mode = 'pathname';
    super.mount(this.forum.attribute('basePath'));

    alertEmailConfirmation(this);

    // Route the home link back home when clicked. We do not want it to register
    // if the user is opening it in a new tab, however.
    $('#home-link').click((e) => {
      if (e.ctrlKey || e.metaKey || e.which === 2) return;
      e.preventDefault();
      app.history.home();

      // Reload the current user so that their unread notification count is refreshed.
      if (app.session.user) {
        app.store.find('users', app.session.user.id());
        m.redraw();
      }
    });
  }

  /**
   * Check whether or not the user is currently composing a reply to a
   * discussion.
   *
   * @param {Discussion} discussion
   * @return {Boolean}
   */
  composingReplyTo(discussion) {
    return (
      this.composer.component instanceof ReplyComposer &&
      this.composer.component.props.discussion === discussion &&
      this.composer.position !== Composer.PositionEnum.HIDDEN
    );
  }

  /**
   * Check whether or not the user is currently viewing a discussion.
   *
   * @param {Discussion} discussion
   * @return {Boolean}
   */
  viewingDiscussion(discussion) {
    return this.current.matches(DiscussionPage, { discussion });
  }

  /**
   * Callback for when an external authenticator (social login) action has
   * completed.
   *
   * If the payload indicates that the user has been logged in, then the page
   * will be reloaded. Otherwise, a SignUpModal will be opened, prefilled
   * with the provided details.
   *
   * @param {Object} payload A dictionary of props to pass into the sign up
   *     modal. A truthy `loggedIn` prop indicates that the user has logged
   *     in, and thus the page is reloaded.
   * @public
   */
  authenticationComplete(payload) {
    if (payload.loggedIn) {
      window.location.reload();
    } else {
      this.modal.show(SignUpModal, payload);
    }
  }
}
