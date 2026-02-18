// Polyfill for 'global' variable (required by sockjs-client)
// This must be imported before any code that uses 'global'

// Set global on window/self/globalThis
if (typeof global === 'undefined') {
  if (typeof window !== 'undefined') {
    window.global = globalThis;
  } else if (typeof self !== 'undefined') {
    self.global = globalThis;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.global = globalThis;
  }
}

// For module scope, we need to use a different approach
// Create a global variable in the global scope
(function() {
  if (typeof global === 'undefined') {
    // @ts-ignore
    global = globalThis;
  }
})();

export {};

