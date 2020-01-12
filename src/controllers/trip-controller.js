import TripInfoComponent from '../components/trip-info.js';
import TripSortComponent from '../components/trip-sort.js';
import TripDaysComponent from '../components/trip-days.js';
import TripDayComponent from '../components/trip-day.js';
import TripEventsComponent from '../components/trip-events.js';
import NoEventsComponent from '../components/no-events.js';
import EventController from './event-controller.js';
import {renderComponent, RenderPosition, removeComponent} from '../utils/render.js';
import {formatFullDate} from '../utils/format.js';
import {SortType, Mode, EmptyEvent} from '../const.js';

const HIDDEN_CLASS = `visually-hidden`;

const renderEvents = (container, events, onDataChange, onViewChange, destinations, offers, defaultSorting) => {
  const eventControllers = [];

  const dates = defaultSorting
    ? [...new Set(events.map((event) => formatFullDate(event.startDate)))]
    : [``];

  dates.forEach((date, index) => {
    const tripDayComponent = defaultSorting
      ? new TripDayComponent(date, index + 1)
      : new TripDayComponent();

    renderComponent(container, tripDayComponent);

    const tripEventsComponent = new TripEventsComponent();
    renderComponent(tripDayComponent.getElement(), tripEventsComponent);

    events
      .filter((event) => defaultSorting
        ? formatFullDate(event.startDate) === date
        : event)
      .forEach((event) => {
        const eventController = new EventController(tripEventsComponent.getElement(), onDataChange, onViewChange, destinations, offers);

        eventController.render(event, Mode.DEFAULT);
        eventControllers.push(eventController);
      });
  });

  return eventControllers;
};

export default class TripController {
  constructor(container, eventsModel, api) {
    this._container = container;
    this._eventControllers = [];
    this._eventsModel = eventsModel;
    this._isDefaultSorting = true;
    this._activeSortType = SortType.DEFAULT;
    this._creatingEvent = null;
    this._api = api;

    this._destinations = [];
    this._offers = [];

    this._noEventsComponent = null;
    this._tripDaysComponent = new TripDaysComponent();
    this._tripSortComponent = new TripSortComponent();
    this._tripInfoComponent = null;

    this._onDataChange = this._onDataChange.bind(this);
    this._onFilterChange = this._onFilterChange.bind(this);
    this._onSortTypeChange = this._onSortTypeChange.bind(this);
    this._onViewChange = this._onViewChange.bind(this);

    this._eventsModel.setFilterChangeHandler(this._onFilterChange);
    this._tripSortComponent.setSortTypeChangeHandler(this._onSortTypeChange);
  }

  _calculateTotalTripCost() {
    const totalPrice = this._eventsModel.getEvents()
      .reduce((totalCost, value) => totalCost + value.price +
        value.offers
          .reduce((totalOffersCost, offer) => totalOffersCost + offer.price, 0),
      0);

    document.querySelector(`.trip-info__cost-value`).textContent = totalPrice;
  }

  _createNoEventsComponent() {
    this._noEventsComponent = new NoEventsComponent();
    renderComponent(this._container, this._noEventsComponent);

    this._removeTripSortComponent();
  }

  _createTripSortComponent() {
    if (!this._tripSortComponent) {
      this._tripSortComponent = new TripSortComponent();
    }

    renderComponent(this._container, this._tripSortComponent, RenderPosition.AFTERBEGIN);
  }

  _onDataChange(eventController, oldData, newData) {
    if (oldData === EmptyEvent) {
      this._creatingEvent = null;

      if (newData === null) {
        eventController.destroy();

        if (eventController.getMode() === Mode.ADDING) {
          this._toggleNoEventsComponent();
        }

        if (eventController.getMode() !== Mode.ADDING) {
          this._updateEvents();
        }
      } else {
        eventController.blockEditForm();

        this._api.createEvent(newData)
          .then((eventModel) => {
            this._eventsModel.addEvent(eventModel);
            eventController.render(eventModel, Mode.DEFAULT);

            this._eventControllers = [].concat(eventController, this._eventControllers);

            this._createTripSortComponent();

            this._removeEvents();
            this._renderEvents(this._eventsModel.getEvents());
          })
          .catch(() => {
            eventController.shake();
          });
      }
    } else if (newData === null) {
      eventController.blockEditForm();

      this._api.deleteEvent(oldData.id)
        .then(() => {
          this._eventsModel.removeEvent(oldData.id);
          this._updateEvents();
          this._toggleNoEventsComponent();
        })
        .catch(() => {
          eventController.shake();
        });
    } else {
      eventController.blockEditForm();

      this._api.updateEvent(oldData.id, newData)
        .then((eventModel) => {
          const isSuccess = this._eventsModel.updateEvent(oldData.id, eventModel);

          if (isSuccess) {
            eventController.render(eventModel, Mode.DEFAULT);
            this._updateEvents();
          }
        })
        .catch(() => {
          eventController.shake();
        });
    }

    this._calculateTotalTripCost();
  }

  _onFilterChange() {
    this._updateEvents();
    this._onSortTypeChange(this._activeSortType);
  }

  _onSortTypeChange(sortType) {
    let sortedEvents = [];
    const events = this._eventsModel.getEvents();

    this._activeSortType = sortType;
    this._isDefaultSorting = sortType === SortType.DEFAULT;

    switch (sortType) {
      case SortType.DEFAULT:
        sortedEvents = events.slice().sort((a, b) => a.startDate - b.startDate);
        break;
      case SortType.TIME:
        sortedEvents = events.slice().sort((a, b) => (b.endDate - b.startDate) - (a.endDate - a.startDate));
        break;
      case SortType.PRICE:
        sortedEvents = events.slice().sort((a, b) => b.price - a.price);
        break;
    }

    this._removeEvents();
    this._renderEvents(sortedEvents);
  }

  _onViewChange() {
    this._eventControllers.forEach((it) => it.setDefaultView());
  }

  _removeEvents() {
    this._tripDaysComponent.getElement().innerHTML = ``;
    this._eventControllers.forEach((eventController) => eventController.destroy());
    this._eventControllers = [];
  }

  _removeNoEventsComponent() {
    if (this._noEventsComponent) {
      removeComponent(this._noEventsComponent);
      this._noEventsComponent = null;
    }
  }

  _removeTripSortComponent() {
    if (this._tripSortComponent) {
      removeComponent(this._tripSortComponent);
      this._tripSortComponent = null;
    }
  }

  _renderEvents(events) {
    this._eventControllers = renderEvents(
        this._tripDaysComponent.getElement(),
        events,
        this._onDataChange,
        this._onViewChange,
        this._destinations,
        this._offers,
        this._isDefaultSorting
    );

    this._tripInfoComponent.rerender(this._eventsModel.getEventsAll());
    this._calculateTotalTripCost();
  }

  _toggleNoEventsComponent() {
    if (this._eventsModel.isNoEvents()) {
      this._createNoEventsComponent();
    } else {
      this._removeNoEventsComponent();
    }
  }

  _updateEvents() {
    this._removeEvents();
    this._renderEvents(this._eventsModel.getEvents());
  }

  createEvent() {
    if (this._creatingEvent) {
      return;
    }

    const container = this._eventsModel.isNoEvents()
      ? document.querySelector(`.trip-events h2`)
      : this._tripSortComponent.getElement();

    this._eventControllers.forEach((it) => it.setDefaultView());

    if (!this._eventsModel.isNoEvents()) {
      this._createTripSortComponent();
    }

    this._removeNoEventsComponent();

    this._creatingEvent = new EventController(
        container,
        this._onDataChange,
        this._onViewChange,
        this._destinations,
        this._offers
    );

    this._creatingEvent.render(EmptyEvent, Mode.ADDING);
  }

  hide() {
    this._container.classList.add(HIDDEN_CLASS);
  }

  render() {
    const container = this._container;
    const events = this._eventsModel.getEvents();

    const tripInfo = document.querySelector(`.trip-main__trip-info`);
    this._tripInfoComponent = new TripInfoComponent(this._eventsModel.getEventsAll());
    renderComponent(tripInfo, this._tripInfoComponent, RenderPosition.AFTERBEGIN);

    renderComponent(container, this._tripDaysComponent);

    this._createTripSortComponent();
    this._toggleNoEventsComponent();

    this._renderEvents(events);
  }

  setDestinations(destinations) {
    this._destinations = destinations;
  }

  setOffers(offers) {
    this._offers = offers;
  }

  show() {
    this._container.classList.remove(HIDDEN_CLASS);
  }
}
