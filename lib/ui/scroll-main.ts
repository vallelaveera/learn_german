/** Scroll a PageShell/ExerciseShell <main> so `el` lands near the top. */
export function scrollMainToElement(el: HTMLElement | null, offset = 8) {
  if (!el) return;
  const main = el.closest("main");
  if (!main) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const top =
    el.getBoundingClientRect().top -
    main.getBoundingClientRect().top +
    main.scrollTop -
    offset;
  main.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
