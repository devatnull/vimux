// Practice editing this JavaScript file with Neovim!
// Try: ciw (change inner word), dd (delete line), yy p (copy/paste)

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const doubled = numbers.map(n => n * 2);
const filtered = numbers.filter(n => n > 5);
const sum = numbers.reduce((a, b) => a + b, 0);

class Calculator {
  constructor() {
    this.result = 0;
  }

  add(x) {
    this.result += x;
    return this;
  }

  subtract(x) {
    this.result -= x;
    return this;
  }

  multiply(x) {
    this.result *= x;
    return this;
  }

  getResult() {
    return this.result;
  }
}

// Try adding a new method to the Calculator class!
// Practice: o (new line below), O (new line above)

const calc = new Calculator();
calc.add(10).subtract(3).multiply(2);
console.log("Result:", calc.getResult());

// TODO: Add a divide method
// TODO: Add error handling
// TODO: Write some tests
