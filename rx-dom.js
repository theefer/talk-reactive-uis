import virtualize from 'vdom-virtualize';

export function renderToDom(nextTree$, initialNode) {
  const initialVDom = virtualize(initialNode);
  const tree$ = nextTree$.startWith(initialVDom);

  return applyAsPatches$(tree$, initialNode).
    subscribeOnError(err => console.error(err));
}



import diff       from 'virtual-dom/diff';
import patch      from 'virtual-dom/patch';

export function applyAsPatches$(tree$, targetNode) {
  return tree$.
    bufferWithCount(2, 1).
    filter(pair => pair.length == 2).
    map(([last, current]) => diff(last, current)).
    reduce((out, patches) => patch(out, patches), targetNode);
}
