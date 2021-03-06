import rome from 'rome';
import moment from 'moment';

import popupTemplate from '../template/datepicker.template';
import scrimTemplate from '../template/scrim.template';
import Events from './events';

import '../scss/material-datetime-picker.scss';

const prefix = 'c-datepicker';
const defaults = () => ({
  default: moment().startOf('hour'),
  // allow the user to override all the classes
  // used for styling the calendar
  styles: {
    scrim: 'c-scrim',
    back: `${prefix}__back`,
    container: `${prefix}__calendar`,
    date: `${prefix}__date`,
    dayBody: `${prefix}__days-body`,
    dayBodyElem: `${prefix}__day-body`,
    dayConcealed: `${prefix}__day--concealed`,
    dayDisabled: `${prefix}__day--disabled`,
    dayHead: `${prefix}__days-head`,
    dayHeadElem: `${prefix}__day-head`,
    dayRow: `${prefix}__days-row`,
    dayTable: `${prefix}__days`,
    month: `${prefix}__month`,
    next: `${prefix}__next`,
    positioned: `${prefix}--fixed`,
    selectedDay: `${prefix}__day--selected`,
    selectedTime: `${prefix}__time--selected`,
    time: `${prefix}__time`,
    timeList: `${prefix}__time-list`,
    timeOption: `${prefix}__time-option`,
    clockNum: `${prefix}__clock__num`
  },
  // format to display in the input, or set on the element
  format: 'DD/MM/YY',
  // the container to append the picker
  container: document.body,
  // allow any dates
  dateValidator: undefined
});

class DateTimePicker extends Events {
  constructor(options = {}) {
    super();
    const styles = Object.assign(defaults().styles, options.styles);
    this.options = Object.assign(defaults(), options);
    this.options.styles = styles;

    // listen to any event
    this.on('*', (evtName, evtData) => {
      if (this.options.el) {
        // if there is a custom element, fire a real dom
        // event on that now
        const event = new CustomEvent(evtName, this, evtData);
        this.options.el.dispatchEvent(event);
      }
    });

    if (this.options.startDate || this.options.endDate) {
      this.startDate = this.options.startDate || moment(0);
      this.endDate = this.options.endDate || moment(8640000000000000);

      this.dateValidator = (date) => {
        return !this.startDate.clone().startOf('day').isAfter(date) && !this.endDate.clone().endOf('day').isBefore(date);
      };

      this.timeValidator = (date) => {
        return !this.startDate.isAfter(date) && !this.endDate.isBefore(date);
      };
    }
  }

  // intialize the rom calendar with our default date and
  // style options
  initializeRome(container, validator) {
    const onData = this.onChangeDate.bind(this);

    return rome(container, {
      styles: this.options.styles,
      time: false,
      dateValidator: validator,
      initialValue: this.value
    }).on('data', onData);
  }

  // called to open the picker
  open() {
    const scrimEl = scrimTemplate(this.options);
    _appendTemplate(document.body, scrimEl);
    _appendTemplate(this.options.container, popupTemplate());
    this.pickerEl = this.options.container.querySelector(`.${prefix}`);
    this.scrimEl = document.body.querySelector(`.${this.options.styles.scrim}`);
    this.amToggleEl = this.$('.c-datepicker__clock--am');
    this.pmToggleEl = this.$('.c-datepicker__clock--pm');

    if (!this.value) {
      // TODO hack
      // set/setDate/setTime need refactoring to have single concerns
      // (set: set the value; setDate/setTime rename to renderDate/renderTime
      //  and deal with updating the view only).
      // For now this allows us to set the default time using the same quantize
      // rules as setting the date explicitly. Setting this.value meets setTime|Date's
      // expectation that we have a value, and `0` guarantees that we will detect
      this.value = moment(0);
      this.setDate(this.options.default);
      this.setTime(this.options.default);
    }

    this.initializeRome(this.$(`.${this.options.styles.container}`), this.dateValidator);
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
      this.scrimEl.classList.add(`${this.options.styles.scrim}--shown`);
      this.pickerEl.classList.add(`${prefix}--open`);
      this.trigger('open');
    });
    return this;
  }

  _dateIsBetween(startDate, endDate, date) {
    return !startDate.isAfter(date) && !endDate.isBefore(date);
  }

  delegateEvents() {
    this.$('.js-cancel')
      .addEventListener('click', () => this.clickCancel(), false);
    this.$('.js-ok')
      .addEventListener('click', () => this.clickSubmit(), false);

    this.$('.js-date-hours').addEventListener('click', e => this.showHourClock(e), false);
    this.$('.js-date-minutes').addEventListener('click', e => this.showMinuteClock(e), false);

    this.$('.js-clock-hours').addEventListener('mouseleave', e => this.mouseOutHourClock(e), false);
    this.$(`.js-clock-hours .${this.options.styles.clockNum}`).forEach((el) => {
      el.addEventListener('click', e => this.clickClickHour(e), false);
      el.addEventListener('mouseenter', e => this.mouseInHourClock(e), false);
    });

    this.$('.js-clock-minutes').addEventListener('mouseleave', e => this.mouseOutMinuteClock(e), false);
    this.$(`.js-clock-minutes .${this.options.styles.clockNum}`).forEach(el => {
      el.addEventListener('click', (e) => this.clickClockMinute(e), false);
      el.addEventListener('mouseenter', e => this.mouseInMinuteClock(e), false);
    });

    this.$('.c-datepicker__clock--am')
      .addEventListener('click', e => this.clickAm(e), false);
    this.$('.c-datepicker__clock--pm')
      .addEventListener('click', e => this.clickPm(e), false);

    this.$('.js-show-calendar')
      .addEventListener('click', e => this.clickShowCalendar(e), false);
    this.$('.js-date-day')
      .addEventListener('click', e => this.clickShowCalendar(e), false);
    this.$('.js-date-month')
      .addEventListener('click', e => this.clickShowCalendar(e), false);

    this.$('.js-show-clock')
      .addEventListener('click', e => this.clickShowClock(e), false);

    return this;
  }

  clickSubmit() {
    this.close();
    this.trigger('submit', this.value, this);
    return this;
  }

  clickCancel() {
    this.close();
    this.trigger('cancel', this.value, this);
    return this;
  }

  clickClickHour(e) {
    const newValue = moment(this.value);
    let number = parseInt(e.currentTarget.getAttribute('data-number'), 10);
    if (number === 0 && this.meridiem === 'pm') {
      number = 12;
    } else if (this.meridiem === 'pm') {
      number += 12;
    }

    newValue.hour(number);
    this.set(newValue);
    return this;
  }

  clickClockMinute(e) {
    const newValue = moment(this.value);
    let number = parseInt(e.currentTarget.getAttribute('data-number'), 10);

    newValue.minute(number);
    this.set(newValue);
    return this;
  }

  setDateInsideLimits() {
    if (this.startDate) {
      if (this.startDate.isAfter(this.value)) {
        this.set(this.startDate);
      }

      if (this.endDate.isBefore(this.value)) {
        this.set(this.endDate);
      }
    }
  }

  onChangeDate(dateString) {
    const newValue = moment(this.value);
    const [year, month, date] = dateString.split('-');
    newValue.set({ year, month: month - 1, date });

    this.set(newValue);
    return this;
  }

  mouseInHourClock() {
    const active = this.$(`.js-clock-hours .${this.options.styles.clockNum}--active`);

    if (active) {
      active.classList.add('hide-hand');
    }
  }

  mouseInMinuteClock() {
    const active = this.$(`.js-clock-minutes .${this.options.styles.clockNum}--active`);

    if (active) {
      active.classList.add('hide-hand');
    }
  }

  mouseOutHourClock() {
    const hideHand = this.$(`.js-clock-hours .${this.options.styles.clockNum}--active.hide-hand`);

    if (hideHand) {
      hideHand.classList.remove('hide-hand');
    }
  }

  mouseOutMinuteClock() {
    const hideHand = this.$(`.js-clock-minutes .${this.options.styles.clockNum}--active.hide-hand`);

    if (hideHand) {
      hideHand.classList.remove('hide-hand');
    }
  }

  disableDateOptions(type) {
    if (this.timeValidator) {
      switch (type) {
        case 'ampm': {
          if (this.startDate || this.endDate) {
            const amStart = this.value.clone().startOf('day');
            const amEnd = amStart.clone().add(12, 'hours').add(-1, 'minutes');

            const pmStart = amStart.clone().add(12, 'hours');
            const pmEnd = pmStart.clone().add(12, 'hours').add(-1, 'minutes');

            if (this._dateIsBetween(this.startDate, this.endDate, amStart)
              || this._dateIsBetween(this.startDate, this.endDate, amEnd)) {
              this.$('.c-datepicker__clock__am-pm-toggle label')[0].setAttribute('disabled', '');
            } else {
              this.$('.c-datepicker__clock__am-pm-toggle label')[0].setAttribute('disabled', 'disabled');
            }

            if (this._dateIsBetween(this.startDate, this.endDate, pmStart)
              || this._dateIsBetween(this.startDate, this.endDate, pmEnd)) {
              this.$('.c-datepicker__clock__am-pm-toggle label')[1].setAttribute('disabled', '');
            } else {
              this.$('.c-datepicker__clock__am-pm-toggle label')[1].setAttribute('disabled', 'disabled');
            }
          }
          break;
        }
        case 'hours': {
          let hoursOffset = 0;
          if (this.meridiem === 'pm') {
            hoursOffset = 12;
          }

          const hours = this.$('.c-datepicker__clock__hours .c-datepicker__clock__num');
          for (let i = 0; i < hours.length; i += 1) {
            const date = this.value.clone().startOf('hour').hour(parseInt(hours[i].getAttribute('data-number'), 10) + hoursOffset);
            if (this.timeValidator(date)) {
              hours[i].classList.remove('c-datepicker__clock__num--disabled');
            } else {
              hours[i].classList.add('c-datepicker__clock__num--disabled');
            }
          }
          break;
        }
        case 'minutes': {
          const minutes = this.$('.c-datepicker__clock__minutes .c-datepicker__clock__num');
          for (let i = 0; i < minutes.length; i += 1) {
            const date = this.value.clone().minute(minutes[i].getAttribute('data-number'));
            if (this.timeValidator(date)) {
              minutes[i].classList.remove('c-datepicker__clock__num--disabled');
            } else {
              minutes[i].classList.add('c-datepicker__clock__num--disabled');
            }
          }
          break;
        }
        default:
          break;
      }
    }
    return this;
  }

  clickAm() {
    const newValue = moment(this.value);
    if (this.meridiem === 'pm') {
      this.meridiem = 'am';
      newValue.hour(newValue.hour() - 12);
    }
    this.set(newValue);
    this.disableDateOptions('hours');
    this.disableDateOptions('minutes');
    return this;
  }

  clickPm() {
    const newValue = moment(this.value);
    if (this.meridiem === 'am') {
      this.meridiem = 'pm';
      newValue.hour(newValue.hour() + 12);
    }
    this.set(newValue);
    this.disableDateOptions('hours');
    this.disableDateOptions('minutes');
    return this;
  }

  showHourClock() {
    this.clickShowClock();
    this.$('.js-clock-hours').classList.add('active');
    this.$('.js-clock-minutes').classList.remove('active');
    this.$('.js-date-hours').classList.add('active');
    this.$('.js-date-minutes').classList.remove('active');
    this.disableDateOptions('hours');
  }

  showMinuteClock() {
    this.clickShowClock();
    this.$('.js-clock-hours').classList.remove('active');
    this.$('.js-clock-minutes').classList.add('active');
    this.$('.js-date-hours').classList.remove('active');
    this.$('.js-date-minutes').classList.add('active');
    this.disableDateOptions('minutes');
  }

  clickShowCalendar() {
    this.$('.js-show-calendar').classList.add('is-selected');
    this.$('.js-show-clock').classList.remove('is-selected');
  }

  clickShowClock() {
    this.$('.js-show-clock').classList.add('is-selected');
    this.$('.js-show-calendar').classList.remove('is-selected');
    this.disableDateOptions('ampm');
  }

  data(val) {
    console.warn(`MaterialDatetimePicker#data is deprecated and will be removed in a future release. Please use get or set.`)
    return (val ? this.set(val) : this.value);
  }

  get() {
    return moment(this.value);
  }

  // update the picker's date/time value
  // value: moment
  // silent: if true, do not fire any events on change
  set(value, { silent = false } = {}) {
    const m = moment(value);

    // maintain a list of change events to fire all at once later
    const evts = [];
    if (m.date() !== this.value.date()
      || m.month() !== this.value.month()
      || m.year() !== this.value.year()
    ) {
      this.setDate(m);
      evts.push('change:date');
    }

    if (m.hour() !== this.value.hour()
      || m.minutes() !== this.value.minutes()
    ) {
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
    if (evts.length > 0 && !silent) {
      // fire all the events we've collected
      this.trigger(['change', ...evts].join(' '), this.value, this);
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

    this.$('.js-day').innerText = dayOfWeek;
    this.$('.js-date-month').innerText = (`${month} ${year}`);
    this.$('.js-date-day').innerText = day;
    this.value.year(m.year());
    this.value.month(m.month());
    this.value.date(m.date());
    this.setDateInsideLimits();
    return this;
  }

  // set the value and header elements to `time`
  // also update the hands of the clock
  setTime(time) {
    const m = moment(time);
    const minuteAsInt = Math.round(parseInt(m.format('mm'), 10) / 5) * 5;
    m.minutes(minuteAsInt);

    const hour = m.format('HH');
    const minutes = m.format('mm');
    const hourAsInt = parseInt(hour, 10) % 12;

    const oldActiveHours = this.$(`.js-clock-hours .${this.options.styles.clockNum}--active`);
    const oldActiveMinutes = this.$(`.js-clock-minutes .${this.options.styles.clockNum}--active`);

    this.$('.js-date-hours').innerText = hour;
    this.$('.js-date-minutes').innerText = minutes;

    if (oldActiveHours) {
      oldActiveHours.classList.remove(`${this.options.styles.clockNum}--active`);
    }

    if (oldActiveMinutes) {
      oldActiveMinutes.classList.remove(`${this.options.styles.clockNum}--active`);
    }

    this.$(`.js-clock-hours .${this.options.styles.clockNum}[data-number="${hourAsInt}"]`)
      .classList.add(`${this.options.styles.clockNum}--active`);
    this.$(`.js-clock-minutes .${this.options.styles.clockNum}[data-number="${minuteAsInt}"]`)
      .classList.add(`${this.options.styles.clockNum}--active`);

    this.value.hours(m.hours());
    this.value.minutes(m.minutes());
    this.meridiem = this.value.format('a');
    this.setDateInsideLimits();

    if (this.meridiem === 'pm') {
      this.amToggleEl.removeAttribute('checked');
      this.pmToggleEl.setAttribute('checked', 'checked');
      this.amToggleEl.parentElement.classList.remove('c-datepicker__toggle--checked');
      this.pmToggleEl.parentElement.classList.add('c-datepicker__toggle--checked');
    } else {
      this.pmToggleEl.removeAttribute('checked');
      this.amToggleEl.setAttribute('checked', 'checked');
      this.pmToggleEl.parentElement.classList.remove('c-datepicker__toggle--checked');
      this.amToggleEl.parentElement.classList.add('c-datepicker__toggle--checked');
    }

    return this;
  }

  // set minimum allowed time date to select
  setStartDate(date) {
    this.startDate = moment(date);
    return this;
  }

  // set maximum allowed time date to select
  setEndDate(date) {
    this.endDate = moment(date);
    return this;
  }

  $(selector) {
    const els = this.pickerEl.querySelectorAll(selector);
    return els.length > 1 ? [...els] : els[0];
  }
}

export default DateTimePicker;

function _appendTemplate(parent, template) {
  const tempEl = document.createElement('div');
  tempEl.innerHTML = template.trim();
  parent.appendChild(tempEl.firstChild);
  return this;
}
