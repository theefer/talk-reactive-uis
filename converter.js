import Rx from 'rx';
import h from 'virtual-dom/h';

import hhelpers from 'hyperscript-helpers';
const {input, select, option} = hhelpers(h);

import {container$, sink$, combine$} from './rx-helpers';
import {renderToDom} from './rx-dom';

const h$ = container$;


const rates = {
  'EUR': 1.36,
  'JPY': 184,
  'CHF': 1.47
};

function lookupRate(currency) {
  return new Promise((resolve) => {
    // Emulate async API call
    setTimeout(() => resolve(rates[currency]), 1000);
  });
}

function round(decimals) {
  const n = Math.pow(10, decimals);
  return float => Math.round(float * n) / n;
}

function noop(x) {
  return x;
}

function replaceValue(newValue) {
  return (oldValue) => newValue;
}

function intents(events) {
  const updateAmount$ = Rx.Observable.merge(
    events.amountChanged$.map(ev => ev.target.value).map(replaceValue),
    events.resetClicked$.map(() => replaceValue(1)),
    events.incrementClicked$.map(() => current => current + 1),
    events.decrementClicked$.map(() => current => Math.max(0, current - 1))
  );
  const updateCurrency$ = Rx.Observable.merge(
    events.currencyChanged$.map(ev => ev.target.value).map(replaceValue),
    events.resetClicked$.map(() => replaceValue('EUR'))
  );

  return {
    updateAmount$,
    updateCurrency$
  };
}

function model(intents) {
  const amount$ = intents.updateAmount$.
        startWith(noop).
        scan((state, func) => func(state), 1).
        shareReplay(1);
  const currency$ = intents.updateCurrency$.
        startWith(noop).
        scan((state, func) => func(state), 'EUR').
        distinctUntilChanged().
        shareReplay(1);

  const rate$ = currency$.
        flatMap(currency => Rx.Observable.fromPromise(lookupRate(currency))).
        shareReplay(1);

  const rateCurrency$ = rate$.
        withLatestFrom(currency$, (_, currency) => currency).
        shareReplay(1);
  const rateLoading$ = Rx.Observable.merge(
    currency$.map(true),
    rate$.map(false)
  );
  const converted$ = combine$(amount$, rate$,
                              (amount, rate) => amount * rate);

  return {
    amount$,
    currency$,
    rate$,
    rateCurrency$,
    rateLoading$,
    converted$
  };
}

function view() {
  const events = {
    amountChanged$: new Rx.Subject(),
    currencyChanged$: new Rx.Subject(),
    decrementClicked$: new Rx.Subject(),
    incrementClicked$: new Rx.Subject(),
    resetClicked$: new Rx.Subject()
  };

  function tree$(model) {
    return h$('main', [
      h$('form', [
        h$('label', [
          h('span.label', 'Amount'),
          model.amount$.map(amount => input({
            type: 'text',
            value: amount,
            oninput: sink$(events.amountChanged$)
          })),
          ' GBP',
          h('button.modifier', {
            type: 'button',
            onclick: sink$(events.incrementClicked$)
          }, '+'),
          h('button.modifier', {
            type: 'button',
            onclick: sink$(events.decrementClicked$)
          }, '-')
        ]),
        h$('label', [
          h('span.label', 'Currency'),
          model.currency$.map(currency => {
            return select({
              onchange: sink$(events.currencyChanged$)
            }, ['EUR', 'JPY', 'CHF'].map(curr => {
              return option({selected: curr == currency}, curr);
            }));
          }),
          ' ',
          model.rateLoading$.flatMap(loading => {
            if (loading) {
              return Rx.Observable.return(h('span.rate', 'loading rate…'));
            } else {
              return h$('span.rate', [
                'rate: 1 GBP = ',
                model.rate$,
                ' ',
                model.rateCurrency$
              ]);
            }
          })
        ])
      ]),
      h$('div.converted', [
        h('span.label', 'Converted'),
        model.converted$.map(round(2)),
        ' ',
        model.rateCurrency$
      ]),
      h('button.reset', {
        type: 'button',
        onclick: sink$(events.resetClicked$)
      }, 'Reset')
    ]);
  }

  return {
    tree$,
    events
  };
}


const out = document.getElementById('out');

const theView = view();
const theModel = model(intents(theView.events));

renderToDom(theView.tree$(theModel), out);
