export function wait(ms = 250) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
