import { extend } from '../../common/extend';
import Page from '../../common/components/Page';
import ItemList from '../../common/utils/ItemList';
import listItems from '../../common/helpers/listItems';
import DiscussionList from './DiscussionList';
import WelcomeHero from './WelcomeHero';
import DiscussionComposer from './DiscussionComposer';
import LogInModal from './LogInModal';
import DiscussionPage from './DiscussionPage';
import Dropdown from '../../common/components/Dropdown';
import Button from '../../common/components/Button';
import LinkButton from '../../common/components/LinkButton';
import SelectDropdown from '../../common/components/SelectDropdown';

/**
 * The `IndexPage` component displays the index page, including the welcome
 * hero, the sidebar, and the discussion list.
 */
export default class IndexPage extends Page {
  static providesInitialSearch = true;

  init() {
    super.init();

    // If the user is returning from a discussion page, then take note of which
    // discussion they have just visited. After the view is rendered, we will
    // scroll down so that this discussion is in view.
    if (app.previous.matches(DiscussionPage)) {
      this.lastDiscussion = app.previous.get('discussion');
    }

    // If the user is coming from the discussion list, then they have either
    // just switched one of the parameters (filter, sort, search) or they
    // probably want to refresh the results. We will clear the discussion list
    // cache so that results are reloaded.
    if (app.previous.matches(IndexPage)) {
      app.discussions.clear();
    }

    app.discussions.refreshParams(app.search.params());

    app.history.push('index', app.translator.trans('core.forum.header.back_to_index_tooltip'));

    this.bodyClass = 'App--index';
  }

  onunload() {
    // Save the scroll position so we can restore it when we return to the
    // discussion list.
    app.cache.scrollTop = $(window).scrollTop();
  }

  view() {
    return (
      <div className="IndexPage">
        {this.hero()}
        <div className="container">
          <div className="sideNavContainer">
            <nav className="IndexPage-nav sideNav">
              <ul>{listItems(this.sidebarItems().toArray())}</ul>
            </nav>
            <div className="IndexPage-results sideNavOffset">
              <div className="IndexPage-toolbar">
                <ul className="IndexPage-toolbar-view">{listItems(this.viewItems().toArray())}</ul>
                <ul className="IndexPage-toolbar-action">{listItems(this.actionItems().toArray())}</ul>
              </div>
              <DiscussionList state={app.discussions} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  config(isInitialized, context) {
    super.config(...arguments);

    if (isInitialized) return;

    extend(context, 'onunload', () => $('#app').css('min-height', ''));

    app.setTitle(app.translator.trans('core.forum.index.meta_title_text'));
    app.setTitleCount(0);

    // Work out the difference between the height of this hero and that of the
    // previous hero. Maintain the same scroll position relative to the bottom
    // of the hero so that the sidebar doesn't jump around.
    const oldHeroHeight = app.cache.heroHeight;
    const heroHeight = (app.cache.heroHeight = this.$('.Hero').outerHeight() || 0);
    const scrollTop = app.cache.scrollTop;

    $('#app').css('min-height', $(window).height() + heroHeight);

    // Scroll to the remembered position. We do this after a short delay so that
    // it happens after the browser has done its own "back button" scrolling,
    // which isn't right. https://github.com/flarum/core/issues/835
    const scroll = () => $(window).scrollTop(scrollTop - oldHeroHeight + heroHeight);
    scroll();
    setTimeout(scroll, 1);

    // If we've just returned from a discussion page, then the constructor will
    // have set the `lastDiscussion` property. If this is the case, we want to
    // scroll down to that discussion so that it's in view.
    if (this.lastDiscussion) {
      const $discussion = this.$(`.DiscussionListItem[data-id="${this.lastDiscussion.id()}"]`);

      if ($discussion.length) {
        const indexTop = $('#header').outerHeight();
        const indexBottom = $(window).height();
        const discussionTop = $discussion.offset().top;
        const discussionBottom = discussionTop + $discussion.outerHeight();

        if (discussionTop < scrollTop + indexTop || discussionBottom > scrollTop + indexBottom) {
          $(window).scrollTop(discussionTop - indexTop);
        }
      }
    }
  }

  /**
   * Get the component to display as the hero.
   *
   * @return {MithrilComponent}
   */
  hero() {
    return WelcomeHero.component();
  }

  /**
   * Build an item list for the sidebar of the index page. By default this is a
   * "New Discussion" button, and then a DropdownSelect component containing a
   * list of navigation items.
   *
   * @return {ItemList}
   */
  sidebarItems() {
    const items = new ItemList();
    const canStartDiscussion = app.forum.attribute('canStartDiscussion') || !app.session.user;

    items.add(
      'newDiscussion',
      Button.component({
        children: app.translator.trans(
          canStartDiscussion ? 'core.forum.index.start_discussion_button' : 'core.forum.index.cannot_start_discussion_button'
        ),
        icon: 'fas fa-edit',
        className: 'Button Button--primary IndexPage-newDiscussion',
        itemClassName: 'App-primaryControl',
        onclick: this.newDiscussionAction.bind(this),
        disabled: !canStartDiscussion,
      })
    );

    items.add(
      'nav',
      SelectDropdown.component({
        children: this.navItems(this).toArray(),
        buttonClassName: 'Button',
        className: 'App-titleControl',
      })
    );

    return items;
  }

  /**
   * Build an item list for the navigation in the sidebar of the index page. By
   * default this is just the 'All Discussions' link.
   *
   * @return {ItemList}
   */
  navItems() {
    const items = new ItemList();
    const params = app.search.stickyParams();

    items.add(
      'allDiscussions',
      LinkButton.component({
        href: app.route('index', params),
        children: app.translator.trans('core.forum.index.all_discussions_link'),
        icon: 'far fa-comments',
      }),
      100
    );

    return items;
  }

  /**
   * Build an item list for the part of the toolbar which is concerned with how
   * the results are displayed. By default this is just a select box to change
   * the way discussions are sorted.
   *
   * @return {ItemList}
   */
  viewItems() {
    const items = new ItemList();
    const sortMap = app.discussions.sortMap();

    const sortOptions = {};
    for (const i in sortMap) {
      sortOptions[i] = app.translator.trans('core.forum.index_sort.' + i + '_button');
    }

    items.add(
      'sort',
      Dropdown.component({
        buttonClassName: 'Button',
        label: sortOptions[app.search.params().sort] || Object.keys(sortMap).map((key) => sortOptions[key])[0],
        children: Object.keys(sortOptions).map((value) => {
          const label = sortOptions[value];
          const active = (app.search.params().sort || Object.keys(sortMap)[0]) === value;

          return Button.component({
            children: label,
            icon: active ? 'fas fa-check' : true,
            onclick: app.search.changeSort.bind(app.search, value),
            active: active,
          });
        }),
      })
    );

    return items;
  }

  /**
   * Build an item list for the part of the toolbar which is about taking action
   * on the results. By default this is just a "mark all as read" button.
   *
   * @return {ItemList}
   */
  actionItems() {
    const items = new ItemList();

    items.add(
      'refresh',
      Button.component({
        title: app.translator.trans('core.forum.index.refresh_tooltip'),
        icon: 'fas fa-sync',
        className: 'Button Button--icon',
        onclick: () => {
          app.discussions.refresh();
          if (app.session.user) {
            app.store.find('users', app.session.user.id());
            m.redraw();
          }
        },
      })
    );

    if (app.session.user) {
      items.add(
        'markAllAsRead',
        Button.component({
          title: app.translator.trans('core.forum.index.mark_all_as_read_tooltip'),
          icon: 'fas fa-check',
          className: 'Button Button--icon',
          onclick: this.markAllAsRead.bind(this),
        })
      );
    }

    return items;
  }

  /**
   * Open the composer for a new discussion or prompt the user to login.
   *
   * @return {Promise}
   */
  newDiscussionAction() {
    const deferred = m.deferred();

    if (app.session.user) {
      const component = new DiscussionComposer({ user: app.session.user });

      app.composer.load(component);
      app.composer.show();

      deferred.resolve(component);
    } else {
      deferred.reject();

      app.modal.show(LogInModal);
    }

    return deferred.promise;
  }

  /**
   * Mark all discussions as read.
   *
   * @return void
   */
  markAllAsRead() {
    const confirmation = confirm(app.translator.trans('core.forum.index.mark_all_as_read_confirmation'));

    if (confirmation) {
      app.session.user.save({ markedAllAsReadAt: new Date() });
    }
  }
}
