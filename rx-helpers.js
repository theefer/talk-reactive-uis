import Rx from 'rx';
import h from 'virtual-dom/h';


export const combine$ = Rx.Observable.combineLatest;

export function sink$(subject) {
  return (event) => subject.onNext(event);
}

export function container$(tagName, children) {
  return sequenceCombine$(children).
    map(views => h(tagName, [...views]));
}

function asObservable(valueOrObservable) {
  if (valueOrObservable instanceof Rx.Observable) {
    return valueOrObservable;
  } else {
    return Rx.Observable.return(valueOrObservable);
  }
}

function sequenceCombine$(items$) {
  // Work around odd behaviour of combineLatest with empty Array
  // (never yields a value)
  if (items$.length === 0) {
    return Rx.Observable.return([]);
  } else {
    const observables$ = items$.map(asObservable);
    return Rx.Observable.combineLatest(observables$, (...all) => all);
  }
}
