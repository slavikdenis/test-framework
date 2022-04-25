const banana = require('./banana.js');
const apple = require('./apple.js');

it('tastes good', () => {
  expect(banana).toBe('good');
});

it('tastes delicious', () => {
  expect(apple).toBe('delicious');
});
