import rome from 'rome';
import _defaults from 'lodash/object/defaults';
import moment from 'moment';
import popupTemplate from '../template/datepicker.hbs';
import scrimTemplate from '../template/scrim.hbs';

import Events from './events';

const prefix = 'c-datepicker';
const defaults = {
  default: moment(),
  // allow the user to override all the classes
  // used for styling the calendar
  styles: {
    scrim: 'c-scrim',
    back: prefix + '__back',
    container: prefix + '__calendar',
    date: prefix + '__date',
    dayBody: prefix + '__days-body',
    dayBodyElem: prefix + '__day-body',
    dayConcealed: prefix + '__day--concealed',
    dayDisabled: prefix + '__day--disabled',
    dayHead: prefix + '__days-head',
    dayHeadElem: prefix + '__day-head',
    dayRow: prefix + '__days-row',
    dayTable: prefix + '__days',
    month: prefix + '__month',
    next: prefix + '__next',
    positioned: prefix + '--fixed',
    selectedDay: prefix + '__day--selected',
    selectedTime: prefix + '__time--selected',
    time: prefix + '__time',
    timeList: prefix + '__time-list',
    timeOption: prefix + '__time-option',
    clockNum: prefix + '__clock__num'
  },
  // format to display in the input, or set on the element
  format: 'dd/MM/YY',
  // the container to append the picker
  container: document.body
};

class MaterialDateTimePicker extends Events {
  constructor(options) {
    super();
    this.options = _defaults({}, options, defaults);
    this.value = this.options.default;

    // listen to any event
    this.on('*', (evtName, evtData) => {
      if (this.options.el) {
        // if there is a custom element, fire a real dom
        // event on that now
        const event = new CustomEvent(evtName, this, evtData);
        this.options.el.dispatchEvent(event);
      }
    });
  }

  // intialize the rom calendar with our default date and
  // style options
  initializeRome() {
    this.rome = rome(this.$(`.${this.options.styles.container}`), {
      styles: this.options.styles,
      time: false
    }).on('data', (value) => this.set(value));
  }

  // called to open the picker
  open() {
    document.body.innerHTML += scrimTemplate
      .replace('{{styles.scrim}}', this.options.styles.scrim);
    this.options.container.innerHTML += popupTemplate;
    this.pickerEl = this.options.container.querySelector('.' + prefix);
    this.scrimEl = this.options.container.querySelector('.' + this.options.styles.scrim);
    this.set(this.value || this.options.default, {
      silent: true
    });
    this.initializeRome();
    this._show();
  }

  close() {
    this._hide();
  }

  _hide() {
    this.pickerEl.classList.remove('open');
    window.setTimeout(() => {
      this.options.container.removeChild(this.pickerEl);
      document.body.removeChild(this.scrimEl);
      this.trigger('close');
    }, 200);
    return this;
  }

  _show() {
    this.delegateEvents();
    // add the animation classes on the next animation tick
    // so that they actually work
    window.requestAnimationFrame(() => {
      this.scrimEl.classList.add(this.options.styles.scrim + '--shown');
      this.pickerEl.classList.add(prefix + '--open');
      this.trigger('open');
    });
    return this;
  }

  delegateEvents() {
    this.$('.js-cancel')
      .addEventListener('click', () => this.close());
    this.$('.js-ok')
      .addEventListener('click', () => this.submit());
    this.$(`.${this.options.styles.clockNum}`)
      .addEventListener('click', (e) => this.clickClock(e));
    return this;
  }

  submit() {
    this.close();
    return this;
  }

  clickClock() {
    return this;
  }

  data(val) {
    return (val ? this.set(val) : this.value);
  }

  set(value, opts) {
    const m = moment(value);
    // maintain a list of change events to fire all at once later
    const evts = [];
    if (!this.value || (this.value && (m.date() !== this.value.date()
      || m.month() !== this.value.month()
      || m.year() !== this.value.year()
    ))) {
      // if the date has not been set yet, or has changed then set it
      // and fire a change:date event
      this.setDate(m);
      evts.push('change:date');
    } else {
      // otherwise just the time is being set
      // so fire a change:time event
      this.setTime(m);
      evts.push('change:time');
    }
    if (this.options.el) {
      // if there is an element to fire events on
      if (this.options.el.tagName === 'INPUT') {
        // and it is an input element then set the value
        this.options.el.value = m.format(this.options.format);
      } else {
        // or any other element set a data-value attribute
        this.options.el.setAttribute('data-value', m.format(this.options.format));
      }
    }
    if (!opts || !opts.silent) {
      // fire all the events we've collected
      this.trigger(['data', 'change', ...evts].join(' '), this.value, this);
    }
  }

  // set the value and header elements to `date`
  // the calendar will be updated automatically
  // by rome when clicked
  setDate(date) {
    const m = moment(date);
    const month = m.format('MMM');
    const day = m.format('Do');
    const dayOfWeek = m.format('dddd');
    const year = m.format('YYYY');
    console.log(month, day, dayOfWeek, year);
    this.$('.js-day').innerText = dayOfWeek;
    this.$('.js-date-month').innerText = (month + ' ' + year);
    this.$('.js-date-day').innerText = day;
    this.value.year(m.year());
    this.value.month(m.month());
    this.value.date(m.date());
    return this;
  }

  // set the value and header elements to `time`
  // also update the hands of the clock
  setTime(time) {
    const m = moment(time);
    const hour = m.format('HH');
    const hourAsInt = parseInt(hour, 10) % 12;
    console.log(hour + ':00');
    this.$('.js-date-hours').innerText = hour;
    this.$(`.${this.options.styles.clockNum}[data-number="${hourAsInt}"]`)
      .classList.add(`.${this.options.styles.clockNum}--active`);
    this.value.hours(m.hours());
    return this;
  }

  $(selector) {
    return this.pickerEl.querySelector(selector);
  }
}

export default MaterialDateTimePicker;