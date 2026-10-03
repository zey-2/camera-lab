/** A finite teaching sequence; its timing is independent of camera settings.
 * @param {{onPhase:(phase:import('./state.mjs').Phase)=>void, setTimer?:typeof setTimeout, clearTimer?:typeof clearTimeout}} options
 * @returns {{play:()=>void, cancel:()=>void, dispose:()=>void}}
 */
export function createPlayback({onPhase, setTimer = setTimeout, clearTimer = clearTimeout}) {
  let generation = 0;
  let disposed = false;
  const timers = new Set();

  function cancel() {
    generation += 1;
    for (const timer of timers) clearTimer(timer);
    timers.clear();
  }

  function play() {
    if (disposed) return;
    cancel();
    const currentGeneration = generation;
    onPhase('viewing');
    if (disposed || currentGeneration !== generation) return;
    for (const [delay, phase] of [[300, 'exposure'], [1200, 'viewing']]) {
      const timer = setTimer(() => {
        timers.delete(timer);
        if (!disposed && currentGeneration === generation) onPhase(phase);
      }, delay);
      timers.add(timer);
    }
  }

  function dispose() {
    disposed = true;
    cancel();
  }

  return {play, cancel, dispose};
}
