// Open modal dialogs (DetailView, Modal) in opening order. Each dialog listens on
// window for Escape and Tab; only the top-most one may act, so Escape in a nested
// confirmation closes just that confirmation and its focus trap alone handles Tab.
const stack: symbol[] = []

// Registers an open dialog and returns its handle. Call `remove` when it closes or unmounts.
export function openDialog() {
  const token = Symbol('dialog')
  stack.push(token)
  return {
    isTop: () => stack.at(-1) === token,
    remove: () => {
      const index = stack.indexOf(token)
      if (index >= 0) stack.splice(index, 1)
    },
  }
}
