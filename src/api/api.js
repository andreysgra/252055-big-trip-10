import EventModel from '../models/event-model.js';
import {RequestMethod} from '../const.js';

const checkStatus = (response) => {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
};

export default class Api {
  constructor(endPoint, authorization) {
    this._endPoint = endPoint;
    this._authorization = authorization;
  }

  _load({url, method = RequestMethod.GET, body = null, headers = new Headers()}) {
    headers.append(`Authorization`, this._authorization);

    return fetch(`${this._endPoint}/${url}`, {method, body, headers})
      .then(checkStatus)
      .catch((err) => {
        throw err;
      });
  }

  createEvent(event) {
    return event;
  }

  deleteEvent(id) {
    return id;
  }

  getDestinations() {
    return this._load({url: `destinations`})
      .then((response) => response.json());
  }

  getEvents() {
    return this._load({url: `points`})
      .then((response) => response.json())
      .then(EventModel.parseEvents);
  }

  getOffers() {
    return this._load({url: `offers`})
      .then((response) => response.json());
  }

  updateEvent(id, data) {
    return this._load({
      url: `points/${id}`,
      method: RequestMethod.PUT,
      body: JSON.stringify(data.toRAW()),
      headers: new Headers({'Content-Type': `application/json`})
    })
      .then((response) => response.json())
      .then(EventModel.parseEvent);
  }
}