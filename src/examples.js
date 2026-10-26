/* Example documents, kept apart from the core logic.
   Each line is [depth, text, ...links]. A link names another line by its text; a leading ~ makes it dashed (indirect).
   exampleItems() turns the names into @n tokens, which Twig then draws as link lines. */
(function(root){
'use strict';
const C = root.Core || require('./core.js');

const EXAMPLES = [
  /* Pattern: investigation notes. Checks point at the suspect they test, findings at the fix, and "still slow?" loops back. */
  {id: 'debug', name: 'Debugging notes', lines: [
    [0, 'Checkout is slow on mobile'],
    [1, 'What we see'],
    [2, 'Nine seconds on 4G'],
    [2, 'Fast on office wifi'],
    [2, 'Started after Tuesday\'s release'],
    [3, 'TBD'],
    [1, 'Suspects'],
    [2, 'Big images'],
    [3, 'Hero banner is 4 MB'],
    [3, 'No lazy loading'],
    [2, 'Third-party scripts'],
    [3, 'Chat widget'],
    [3, 'Analytics tag'],
    [2, 'Slow API'],
    [3, 'Cart total endpoint'],
    [3, 'Shipping rates endpoint'],
    [1, 'Checks'],
    [2, 'Lighthouse on a throttled phone', 'Hero banner is 4 MB'],
    [2, 'Compare the waterfall before and after Tuesday', '~Analytics tag'],
    [2, 'Disable the chat widget and retest', 'Chat widget'],
    [2, 'Time the shipping endpoint in the logs', 'Shipping rates endpoint'],
    [1, 'Findings'],
    [2, 'Shipping rates take six seconds', 'Cache miss on every request'],
    [2, 'Cache miss on every request', 'Cache shipping rates for a minute'],
    [2, 'Banner is huge but already cached', '~Compress the banner'],
    [1, 'Fix'],
    [2, 'Cache shipping rates for a minute'],
    [2, 'Compress the banner'],
    [2, 'Add a timeout'],
    [1, 'Retest'],
    [2, 'Still slow?', 'Lighthouse on a throttled phone'],
    [2, 'Ship the fix', 'Cache shipping rates for a minute'],
    [2, 'Write down what happened']]},

  /* Pattern: a screen map. Links are the taps between screens, including the ways back; dashed is optional or indirect. */
  {id: 'flow', name: 'App screen flow', lines: [
    [0, 'Meal planner: screens and paths'],
    [1, 'First run'],
    [2, 'Welcome', 'Sign in'],
    [2, 'Sign in', 'Pick your diet'],
    [2, 'Skip for now', '~This week'],
    [2, 'Pick your diet', 'This week'],
    [1, 'Home'],
    [2, 'This week'],
    [2, 'Add a meal', 'Search'],
    [2, 'Shopping list'],
    [2, 'Search', 'Recipe detail'],
    [1, 'Recipe'],
    [2, 'Recipe detail', 'Cooking mode'],
    [2, 'Cooking mode', 'Rate the recipe'],
    [2, 'Rate the recipe', 'This week'],
    [2, 'Swap an ingredient', 'Recipe detail'],
    [2, 'Save to favourites'],
    [1, 'Empty and error states'],
    [2, 'No meals planned yet', 'Add a meal'],
    [2, 'No search results', 'Search'],
    [2, 'No connection', '~This week'],
    [2, 'TBD'],
    [1, 'Settings'],
    [2, 'Diet and allergies', '~Swap an ingredient'],
    [2, 'Notifications'],
    [2, 'Units: grams or cups']]},

  /* Pattern: three separate trees (problems, ideas, next steps). Ideas link to the problem they solve; dashed means "goes well with". */
  {id: 'ideas', name: 'Idea board', lines: [
    [0, 'Problems I notice'],
    [1, 'Plants die when I travel'],
    [2, 'Nobody to water them'],
    [2, 'I forget which one needs what'],
    [1, 'I buy plants and forget their names'],
    [1, 'Light is a guess'],
    [0, 'Ideas for a plant app'],
    [1, 'Reminders'],
    [2, 'Watering reminders per plant', 'I forget which one needs what'],
    [2, 'Fertiliser every six weeks', '~Watering reminders per plant'],
    [1, 'Learning'],
    [2, 'Photo to name the plant', 'I buy plants and forget their names'],
    [2, 'Care card to scan', 'I forget which one needs what'],
    [1, 'Sensors'],
    [2, 'Light meter from the camera', 'Light is a guess'],
    [2, 'Soil moisture stick'],
    [1, 'Social'],
    [2, 'Plant sitter swap with neighbours', 'Nobody to water them'],
    [2, 'Plant diary with a weekly photo', '~Photo to name the plant'],
    [1, 'Wild idea'],
    [2, 'Plants that text you', '~Watering reminders per plant'],
    [0, 'Try this week'],
    [1, 'Ask five friends about travelling', 'Plant sitter swap with neighbours'],
    [1, 'Sketch the care card', 'Care card to scan'],
    [1, 'Test the light meter on my windowsill', 'Light meter from the camera'],
    [1, 'Find a name'],
    [2, 'Leafy'],
    [2, 'Fern and Co'],
    [2, 'TBD']]}
];

function exampleItems(id){
  const ex = EXAMPLES.find(e => e.id === id) || EXAMPLES[0];
  const at = new Map();
  ex.lines.forEach((l, i) => { if (!at.has(l[1])) at.set(l[1], i + 1); });
  return ex.lines.map(l => {
    const tokens = l.slice(2).map(t => {
      const indirect = t[0] === '~', n = at.get(indirect ? t.slice(1) : t);
      return n ? (indirect ? '@@' : '@') + n : '';
    }).filter(Boolean);
    return {depth: l[0], text: tokens.length ? l[1] + ' ' + tokens.join(' ') : l[1]};
  });
}

C.EXAMPLES = EXAMPLES;
C.exampleItems = exampleItems;
if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(this);
