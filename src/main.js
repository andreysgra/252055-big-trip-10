import MenuComponent from './components/menu.js';
import FilterComponent from './components/filter.js';
import TripInfoComponent from './components/trip-info.js';
import TripSortComponent from './components/trip-sort.js';
import TripDaysComponent from './components/trip-days.js';
import TripDayComponent from './components/trip-day.js';
import TripEventsComponent from './components/trip-events.js';
import TripEventComponent from './components/trip-event.js';
import TripEventEditComponent from './components/trip-event-edit.js';
import {renderComponent} from './utils.js';
import {FILTERS, MENU_ITEMS, RenderPosition} from './const.js';
import {generateEvents} from './mock/event.js';

const EVENTS_COUNT = 4;

let lastEvent = null;
let lastEditEvent = null;

const events = generateEvents(EVENTS_COUNT);

const renderEvent = (event) => {
  const eventComponent = new TripEventComponent(event);
  const eventEditComponent = new TripEventEditComponent(event);

  const eventReplaceComponent = (newComponent, oldComponent) => {
    tripEventsListElement.replaceChild(newComponent.getElement(), oldComponent.getElement());
  };

  const eventEditHandler = () => {
    if (lastEditEvent) {
      eventReplaceComponent(lastEvent, lastEditEvent);
    }

    eventReplaceComponent(eventEditComponent, eventComponent);

    lastEvent = eventComponent;
    lastEditEvent = eventEditComponent;
  };

  const eventSubmitHadler = () => {
    eventReplaceComponent(eventComponent, eventEditComponent);

    lastEvent = null;
    lastEditEvent = null;
  };

  eventComponent.setRollupButtonHandler(eventEditHandler);
  eventEditComponent.setSubmitFormHandler(eventSubmitHadler);

  renderComponent(tripEventsListElement, eventComponent.getElement());
};

const tripInfo = document.querySelector(`.trip-main__trip-info`);
renderComponent(tripInfo, new TripInfoComponent(events).getElement(), RenderPosition.AFTERBEGIN);

const tripControls = document.querySelector(`.trip-main__trip-controls`);
renderComponent(tripControls, new MenuComponent(MENU_ITEMS).getElement(), RenderPosition.AFTERBEGIN);
renderComponent(tripControls, new FilterComponent(FILTERS).getElement());

const tripEvents = document.querySelector(`.trip-events`);
renderComponent(tripEvents, new TripSortComponent().getElement());

const tripDaysComponent = new TripDaysComponent();
renderComponent(tripEvents, tripDaysComponent.getElement());

const tripDayComponent = new TripDayComponent();
renderComponent(tripDaysComponent.getElement(), tripDayComponent.getElement());

const tripEventsComponent = new TripEventsComponent();
const tripEventsListElement = tripEventsComponent.getElement();
renderComponent(tripDayComponent.getElement(), tripEventsComponent.getElement());

events
  .slice(0, EVENTS_COUNT)
  .forEach((event) => renderEvent(event));


const tripCost = events.reduce((acc, value) => acc + value.price, 0);
tripInfo.querySelector(`.trip-info__cost-value`).textContent = tripCost;
