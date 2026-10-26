/**
 * Pack 1 authoring generator — DEV ONLY (Node), never runs in the app.
 *
 * Deterministically authors packs/sunny-home-garden/ from the founder-approved
 * brief: placeholder SVG art, all record JSONs, and correctly-computed
 * file_hashes + pack_sha256 (same algorithm the validator verifies). Re-run
 * after Krea art replacement to regenerate hashes.
 *
 * It does NOT invent hashes: SHA-256 digests are computed here and then
 * independently proven by tools/validator.js (asset content vs manifest hash).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');
const DIR = path.join(process.cwd(), 'packs', 'sunny-home-garden');
const CORE = path.join(process.cwd(), 'packs', 'core');

function svg(color, shape) {
  const marker = 'PLACEHOLDER ART (draft) — replace via founder Krea pipeline before live';
  const shapes = {
    circle: `<circle cx="50" cy="50" r="34" fill="${color}"/>`,
    rect: `<rect x="20" y="28" width="60" height="44" rx="8" fill="${color}"/>`,
    ellipseTall: `<ellipse cx="50" cy="50" rx="20" ry="34" fill="${color}"/>`,
    ellipseWide: `<ellipse cx="50" cy="50" rx="34" ry="18" fill="${color}"/>`,
    tallTeardrop: `<path d="M50 8 C 74 40 78 66 50 90 C 22 66 26 40 50 8 Z" fill="${color}"/>`,
    basket: `<path d="M18 40 L82 40 L72 82 L28 82 Z" fill="${color}"/><path d="M26 40 A24 10 0 0 1 74 40" fill="none" stroke="${color}" stroke-width="5"/>`,
    hexagon: `<polygon points="50,12 82,32 82,68 50,88 18,68 18,32" fill="${color}"/>`,
    sock: `<path d="M26 32 L74 32 L74 56 L58 56 L54 72 L46 72 L50 56 L26 56 Z" fill="${color}"/>`,
    flower: `<circle cx="50" cy="44" r="18" fill="${color}"/><rect x="46" y="58" width="8" height="28" rx="3" fill="#6FA85E"/>`,
    card: `<rect x="18" y="22" width="64" height="56" rx="6" fill="${color}"/><rect x="26" y="34" width="48" height="7" rx="3" fill="#FFFFFF" opacity="0.7"/><rect x="26" y="48" width="32" height="7" rx="3" fill="#FFFFFF" opacity="0.7"/>`,
    hands: `<circle cx="34" cy="52" r="18" fill="${color}"/><circle cx="66" cy="52" r="18" fill="${color}"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <!-- ${marker} -->\n  ${shapes[shape]}\n</svg>\n`;
}

const ASSETS = {
  'soli.svg': { kind: 'shape', shape: 'circle', color: '#F5C542' },
  'fern.svg': { kind: 'shape', shape: 'tallTeardrop', color: '#8BAE7E' },
  'cup.svg': { kind: 'reuse', from: 'assets/warm-cup.svg' },
  'spoon.svg': { kind: 'shape', shape: 'ellipseTall', color: '#C8CBD1' },
  'book.svg': { kind: 'shape', shape: 'rect', color: '#6E9BD1' },
  'ball.svg': { kind: 'shape', shape: 'circle', color: '#E0524D' },
  'red-flower.svg': { kind: 'shape', shape: 'flower', color: '#E0524D' },
  'yellow-flower.svg': { kind: 'shape', shape: 'flower', color: '#F5C542' },
  'blue-flower.svg': { kind: 'shape', shape: 'flower', color: '#5B7CC4' },
  'green-flower.svg': { kind: 'shape', shape: 'flower', color: '#7FBF7B' },
  'red-ball.svg': { kind: 'shape', shape: 'circle', color: '#E0524D' },
  'yellow-cup.svg': { kind: 'shape', shape: 'ellipseTall', color: '#F5C542' },
  'blue-book.svg': { kind: 'shape', shape: 'rect', color: '#5B7CC4' },
  'green-leaf.svg': { kind: 'shape', shape: 'ellipseWide', color: '#7FBF7B' },
  'red-basket.svg': { kind: 'shape', shape: 'basket', color: '#E0524D' },
  'yellow-basket.svg': { kind: 'shape', shape: 'basket', color: '#F5C542' },
  'sort-red-ball.svg': { kind: 'shape', shape: 'circle', color: '#E0524D' },
  'sort-red-sock.svg': { kind: 'shape', shape: 'sock', color: '#E0524D' },
  'sort-yellow-cup.svg': { kind: 'shape', shape: 'ellipseTall', color: '#F5C542' },
  'sort-yellow-book.svg': { kind: 'shape', shape: 'rect', color: '#F5C542' },
  'sort-blue-spoon.svg': { kind: 'shape', shape: 'ellipseTall', color: '#5B7CC4' },
  'sort-blue-leaf.svg': { kind: 'shape', shape: 'ellipseWide', color: '#5B7CC4' },
  'now-tidy-card.svg': { kind: 'shape', shape: 'card', color: '#8BAE7E' },
  'next-song-card.svg': { kind: 'shape', shape: 'card', color: '#9B6FA3' },
  'laundry-basket.svg': { kind: 'shape', shape: 'basket', color: '#D9B382' },
  'cardboard-box.svg': { kind: 'shape', shape: 'rect', color: '#C89B6A' },
  'flat-towel.svg': { kind: 'shape', shape: 'rect', color: '#E4C9A0' },
  'soft-toy.svg': { kind: 'shape', shape: 'circle', color: '#E8A5A5' },
  'book-stack.svg': { kind: 'shape', shape: 'rect', color: '#6E9BD1' },
  'clean-socks.svg': { kind: 'shape', shape: 'sock', color: '#9BB8E0' },
  'plastic-plate.svg': { kind: 'shape', shape: 'circle', color: '#A7D3C8' },
  'paper-plate.svg': { kind: 'shape', shape: 'circle', color: '#E7E3D5' },
  'placemat.svg': { kind: 'shape', shape: 'rect', color: '#E4C9A0' },
  'plastic-cup.svg': { kind: 'shape', shape: 'ellipseTall', color: '#F5C542' },
  'paper-cup.svg': { kind: 'shape', shape: 'ellipseTall', color: '#E7E3D5' },
  'cloth-napkin.svg': { kind: 'shape', shape: 'rect', color: '#8BAE7E' },
  'paper-towel-sheet.svg': { kind: 'shape', shape: 'rect', color: '#F3F1EA' },
  'tea-towel.svg': { kind: 'reuse', from: 'assets/folded-towel.svg' },
  'watering-can.svg': { kind: 'shape', shape: 'basket', color: '#6FA8DC' },
  'damp-cloth.svg': { kind: 'shape', shape: 'rect', color: '#9BB8E0' },
  'indoor-plant.svg': { kind: 'shape', shape: 'flower', color: '#7FBF7B' },
  'outdoor-plant.svg': { kind: 'shape', shape: 'flower', color: '#6FA85E' },
  'night-lamp.svg': { kind: 'shape', shape: 'hexagon', color: '#F5D37A' },
  'closed-curtains.svg': { kind: 'shape', shape: 'rect', color: '#9B6FA3' },
  'quiet-book.svg': { kind: 'shape', shape: 'rect', color: '#6E9BD1' },
  'song-time-card.svg': { kind: 'shape', shape: 'card', color: '#9B6FA3' },
  'helping-hands.svg': { kind: 'shape', shape: 'hands', color: '#E8C9A0' },
};

const ITEMS = [
  { id: 'cup', asset: 'cup.svg', label: 'Cup', alt: 'A cup.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'spoon', asset: 'spoon.svg', label: 'Spoon', alt: 'A spoon.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'book', asset: 'book.svg', label: 'Book', alt: 'A book.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'ball', asset: 'ball.svg', label: 'Ball', alt: 'A ball.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'red-flower', asset: 'red-flower.svg', label: 'Red Flower', alt: 'A red flower.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'yellow-flower', asset: 'yellow-flower.svg', label: 'Yellow Flower', alt: 'A yellow flower.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'blue-flower', asset: 'blue-flower.svg', label: 'Blue Flower', alt: 'A blue flower.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'green-flower', asset: 'green-flower.svg', label: 'Green Flower', alt: 'A green flower.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'red-ball', asset: 'red-ball.svg', label: 'Red Ball', alt: 'A red ball.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'yellow-cup', asset: 'yellow-cup.svg', label: 'Yellow Cup', alt: 'A yellow cup.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'blue-book', asset: 'blue-book.svg', label: 'Blue Book', alt: 'A blue book.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'green-leaf', asset: 'green-leaf.svg', label: 'Green Leaf', alt: 'A green leaf.', size: 'handheld_safe', tags: ['household_safe', 'nature_item'] },
  { id: 'red-basket', asset: 'red-basket.svg', label: 'Red Basket', alt: 'A red basket.', size: 'large_household', tags: ['household_safe'] },
  { id: 'yellow-basket', asset: 'yellow-basket.svg', label: 'Yellow Basket', alt: 'A yellow basket.', size: 'large_household', tags: ['household_safe'] },
  { id: 'sort-red-ball', asset: 'sort-red-ball.svg', label: 'Red Ball', alt: 'A red ball.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'sort-red-sock', asset: 'sort-red-sock.svg', label: 'Red Sock', alt: 'A red sock.', size: 'handheld_safe', tags: ['household_safe', 'soft_fabric'] },
  { id: 'sort-yellow-cup', asset: 'sort-yellow-cup.svg', label: 'Yellow Cup', alt: 'A yellow cup.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'sort-yellow-book', asset: 'sort-yellow-book.svg', label: 'Yellow Book', alt: 'A yellow book.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'sort-blue-spoon', asset: 'sort-blue-spoon.svg', label: 'Blue Spoon', alt: 'A blue spoon.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'sort-blue-leaf', asset: 'sort-blue-leaf.svg', label: 'Blue Leaf', alt: 'A blue leaf.', size: 'handheld_safe', tags: ['household_safe', 'nature_item'] },
  { id: 'now-tidy-card', asset: 'now-tidy-card.svg', label: 'Now Card: Tidy', alt: 'A card showing tidying.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'next-song-card', asset: 'next-song-card.svg', label: 'Next Card: Sing', alt: 'A card showing singing.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'laundry-basket', asset: 'laundry-basket.svg', label: 'Laundry Basket', alt: 'A laundry basket.', size: 'large_household', tags: ['household_safe'] },
  { id: 'cardboard-box', asset: 'cardboard-box.svg', label: 'Cardboard Box', alt: 'A cardboard box.', size: 'large_household', tags: ['household_safe'] },
  { id: 'flat-towel', asset: 'flat-towel.svg', label: 'Flat Towel', alt: 'A towel laid flat.', size: 'large_household', tags: ['household_safe', 'soft_fabric'] },
  { id: 'soft-toy', asset: 'soft-toy.svg', label: 'Soft Toy', alt: 'A soft toy.', size: 'handheld_safe', tags: ['household_safe', 'soft_fabric'] },
  { id: 'book-stack', asset: 'book-stack.svg', label: 'Books', alt: 'A stack of books.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'clean-socks', asset: 'clean-socks.svg', label: 'Clean Socks', alt: 'A pair of clean socks.', size: 'handheld_safe', tags: ['household_safe', 'soft_fabric'] },
  { id: 'plastic-plate', asset: 'plastic-plate.svg', label: 'Plastic Plate', alt: 'A plastic plate.', size: 'large_household', tags: ['household_safe'] },
  { id: 'paper-plate', asset: 'paper-plate.svg', label: 'Paper Plate', alt: 'A paper plate.', size: 'large_household', tags: ['household_safe'] },
  { id: 'placemat', asset: 'placemat.svg', label: 'Placemat', alt: 'A placemat.', size: 'large_household', tags: ['household_safe'] },
  { id: 'plastic-cup', asset: 'plastic-cup.svg', label: 'Plastic Cup', alt: 'A plastic cup.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'paper-cup', asset: 'paper-cup.svg', label: 'Paper Cup', alt: 'A paper cup.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'cloth-napkin', asset: 'cloth-napkin.svg', label: 'Cloth Napkin', alt: 'A cloth napkin.', size: 'handheld_safe', tags: ['household_safe', 'soft_fabric'] },
  { id: 'paper-towel-sheet', asset: 'paper-towel-sheet.svg', label: 'Paper Towel', alt: 'A paper towel sheet.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'tea-towel', asset: 'tea-towel.svg', label: 'Tea Towel', alt: 'A tea towel.', size: 'handheld_safe', tags: ['household_safe', 'soft_fabric'] },
  { id: 'watering-can', asset: 'watering-can.svg', label: 'Watering Can', alt: 'A watering can.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'damp-cloth', asset: 'damp-cloth.svg', label: 'Damp Cloth', alt: 'A damp cloth.', size: 'handheld_safe', tags: ['household_safe', 'soft_fabric'] },
  { id: 'indoor-plant', asset: 'indoor-plant.svg', label: 'Indoor Plant', alt: 'An indoor plant.', size: 'large_household', tags: ['household_safe', 'nature_item'] },
  { id: 'outdoor-plant', asset: 'outdoor-plant.svg', label: 'Outdoor Plant', alt: 'An outdoor plant.', size: 'large_household', tags: ['household_safe', 'nature_item'] },
  { id: 'night-lamp', asset: 'night-lamp.svg', label: 'Night Lamp', alt: 'A small night lamp.', size: 'large_household', tags: ['household_safe'] },
  { id: 'closed-curtains', asset: 'closed-curtains.svg', label: 'Closed Curtains', alt: 'Closed curtains.', size: 'large_household', tags: ['household_safe'] },
  { id: 'quiet-book', asset: 'quiet-book.svg', label: 'Quiet Book', alt: 'A quiet book.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'song-time-card', asset: 'song-time-card.svg', label: 'Song Card', alt: 'A card for song time.', size: 'handheld_safe', tags: ['household_safe'] },
  { id: 'helping-hands', asset: 'helping-hands.svg', label: 'Helping Hands', alt: 'Two helping hands.', size: 'handheld_safe', tags: ['household_safe'] },
];

const author = { created_by: 'kilo', reviewed_by: 'founder', notes_author: 'DRAFT — pending founder review and signature, placeholder art, not live.' };
const V = '1.0.0';
const LOCALE = 'en-US';
const AGE = '3-4';

const en = {};

function itemKey(id) {
  return id.replace(/-/g, '_');
}

function itemKeys() {
  for (const it of ITEMS) {
    en[`item.${itemKey(it.id)}.label`] = it.label;
    en[`item.${itemKey(it.id)}.alt_parent`] = it.alt;
  }
}

en['pack.sunny_home_garden.title'] = 'Sunny Home Garden';
en['pack.sunny_home_garden.summary'] =
  'A gentle first pack set in a small round house and its sunny garden, with Soli and Fern, four lessons, two team missions, and a goodnight routine.';

en['character.soli.name'] = 'Soli';
en['character.soli.line_1'] = 'What is this? Let us find out together!';
en['character.soli.line_2'] = 'You tried it — let us sing about it!';
en['character.soli.design_bible.silhouette'] =
  'Perfect circle body with a big round head merged into one round shape, tiny legs, and two short leaf-ears on top; reads as a single circle at thumbnail size.';
en['character.soli.design_bible.palette'] =
  'Warm yellow body, coral cheeks and leaf-ears, cream belly; one warm accent family only.';
en['character.soli.design_bible.prop'] =
  'Small sun-shaped hand drum, tapped with a flat hand, never shaken near the face; the song prop.';
en['character.soli.design_bible.movement'] =
  'Bounces twice on every celebration; bright, bouncy, and curious.';

en['character.fern.name'] = 'Fern';
en['character.fern.line_1'] = 'Where does this go? We can look together.';
en['character.fern.line_2'] = 'What comes next? Take your time.';
en['character.fern.design_bible.silhouette'] =
  'Tall pear or teardrop body with a long neck, long drooping leaf-ears, and long arms; reads as a tall teardrop, the opposite of Soli in height and width.';
en['character.fern.design_bible.palette'] =
  'Sage green body, cream belly, plum leaf-ears; one cool accent family only, sharing no dominant colour with Soli.';
en['character.fern.design_bible.prop'] =
  'Small soft sorting basket for lessons, and a small green watering can with a short spout for missions.';
en['character.fern.design_bible.movement'] =
  'Sways gently side to side while waiting; calm, patient, and methodical, never rushing the child.';

en['skill.everyday_object_words.title'] = 'Everyday Object Words';
en['skill.everyday_object_words.description'] =
  'Meet and name friendly everyday objects around the sunny home garden.';
en['skill.colour_naming.title'] = 'Colour Naming';
en['skill.colour_naming.description'] =
  'Name and match gentle colours in the Colour Garden — red, yellow, blue, and later green.';
en['skill.sorting_one_rule.title'] = 'Sorting, One Rule';
en['skill.sorting_one_rule.description'] =
  'Sort household things into two groups with one kind rule at the tidy shed sorting basket.';
en['skill.sequencing_now_next.title'] = 'Now and Next';
en['skill.sequencing_now_next.description'] =
  'Put two little steps in order — now first, then next — at the kitchen table and the bedtime porch.';

en['scaffold.l0.prompt'] = 'Take a look at all the pictures and tap when you are ready.';
en['scaffold.l1.prompt'] = 'Here are two calm choices — tap the one we noticed together.';
en['scaffold.l2.prompt'] = 'Watch the gentle glow, then tap the glowing picture.';
en['scaffold.l3.prompt'] = 'Let us do it together — I will point, and you make the final tap.';

en['lesson.hello_cup.title'] = 'Hello, Cup!';
en['lesson.hello_cup.step_1.prompt'] = 'Soli holds up something from the kitchen shelf. Tap it to hear its name!';
en['lesson.hello_cup.step_1.celebration'] = 'You tapped the cup — Soli sings its name for you!';
en['lesson.hello_cup.step_2.prompt'] = 'Soli says “cup”! Can you tap the cup?';
en['lesson.hello_cup.step_2.celebration'] = 'There it is — you found the cup!';
en['lesson.hello_cup.step_3.prompt'] = 'Now say it with Soli — tap the cup and say “cup”!';
en['lesson.hello_cup.step_3.celebration'] = 'You said the word with Soli — what a friendly hello!';
en['lesson.hello_cup.step_4.prompt'] = 'The cup is hiding in the garden. Can you tap it?';
en['lesson.hello_cup.step_4.celebration'] = 'You found the cup in the garden!';
en['lesson.hello_cup.step_5.prompt'] = 'One more hello for the cup — tap it gently!';
en['lesson.hello_cup.step_5.celebration'] = 'Hello, cup! Soli bounces twice for you!';
en['lesson.hello_cup.closing_win'] =
  'We said hello to the cup together — and finished with a song!';

en['lesson.red_flower_yellow_flower.title'] = 'Red Flower, Yellow Flower';
en['lesson.red_flower_yellow_flower.step_1.prompt'] =
  'Two flowers are the same colour here. Tap the red flower!';
en['lesson.red_flower_yellow_flower.step_1.celebration'] = 'You matched the two red flowers!';
en['lesson.red_flower_yellow_flower.step_2.prompt'] =
  'Soli sings “red”! Tap a flower that is red.';
en['lesson.red_flower_yellow_flower.step_2.celebration'] =
  'Red, red, red — you found the red flower!';
en['lesson.red_flower_yellow_flower.step_3.prompt'] =
  'Say “red” with Soli — tap the red flower and sing it together.';
en['lesson.red_flower_yellow_flower.step_3.celebration'] =
  'You sang the colour name with Soli!';
en['lesson.red_flower_yellow_flower.step_4.prompt'] =
  'One more red thing is in the garden. Tap it!';
en['lesson.red_flower_yellow_flower.step_4.celebration'] =
  'A red ball — you found another red thing!';
en['lesson.red_flower_yellow_flower.step_5.prompt'] =
  'Tap the red flower one more time for our colour song!';
en['lesson.red_flower_yellow_flower.step_5.celebration'] =
  'Red flower, yellow flower — you named the colours!';
en['lesson.red_flower_yellow_flower.closing_win'] =
  'We matched and named colours together — and finished with a song!';

en['lesson.where_does_this_go.title'] = 'Where Does This Go?';
en['lesson.where_does_this_go.step_1.prompt'] =
  'Fern shows two baskets. Red things go in the red basket — tap the red basket!';
en['lesson.where_does_this_go.step_1.celebration'] = 'The red basket is ready!';
en['lesson.where_does_this_go.step_2.prompt'] =
  'Fern puts the first one in. Now you tap something red!';
en['lesson.where_does_this_go.step_2.celebration'] = 'The red ball goes in — red things together!';
en['lesson.where_does_this_go.step_3.prompt'] = 'Your turn to sort. Tap something red!';
en['lesson.where_does_this_go.step_3.celebration'] = 'The red sock joins the red group!';
en['lesson.where_does_this_go.step_4.prompt'] = 'Two things left. Tap something yellow!';
en['lesson.where_does_this_go.step_4.celebration'] = 'The yellow book goes in the yellow group!';
en['lesson.where_does_this_go.step_5.prompt'] =
  'The baskets are full! Tap a basket to name the groups together.';
en['lesson.where_does_this_go.step_5.celebration'] =
  'Red things and yellow things — two tidy groups!';
en['lesson.where_does_this_go.closing_win'] =
  'We sorted with one kind rule together — and finished with a song!';

en['lesson.now_next.title'] = 'Now, Next!';
en['lesson.now_next.step_1.prompt'] = 'Two cards are mixed up. Tap them to look together!';
en['lesson.now_next.step_1.celebration'] = 'We looked at both cards together!';
en['lesson.now_next.step_2.prompt'] = 'Which card is for now? Tap the Now card!';
en['lesson.now_next.step_2.celebration'] = 'Now comes first — we tidy now!';
en['lesson.now_next.step_3.prompt'] = 'Which card comes after now? Tap the Next card!';
en['lesson.now_next.step_3.celebration'] = 'Next comes after now — we sing next!';
en['lesson.now_next.step_4.prompt'] =
  'Watch Soli and Fern act it out — tap the Now card as they tidy!';
en['lesson.now_next.step_4.celebration'] =
  'Now, then next — they showed the whole little routine!';
en['lesson.now_next.step_5.prompt'] = 'Tap the Next card to act it out with them!';
en['lesson.now_next.step_5.celebration'] = 'Now and next — you put the day in order!';
en['lesson.now_next.closing_win'] =
  'We put two little steps in order — now, then next — and finished with a goodnight song!';

en['song.our_colour_song.title'] = 'Our Colour Song';
en['song.our_colour_song.lesson_word'] = 'cup';
en['song.our_colour_song.fixed_ending'] = 'We did it, hooray!';
en['song.our_goodnight_song.title'] = 'Our Goodnight Song';
en['song.our_goodnight_song.lesson_word'] = 'sing';
en['song.our_goodnight_song.fixed_ending'] = 'Goodnight, garden, goodnight!';

en['song.wordlist.colour_red'] = 'Red';
en['song.wordlist.colour_yellow'] = 'Yellow';
en['song.wordlist.colour_blue'] = 'Blue';
en['song.wordlist.colour_green'] = 'Green';
en['song.wordlist.object_cup'] = 'Cup';
en['song.wordlist.object_spoon'] = 'Spoon';
en['song.wordlist.object_book'] = 'Book';
en['song.wordlist.object_ball'] = 'Ball';
en['song.wordlist.object_sock'] = 'Sock';
en['song.wordlist.object_leaf'] = 'Leaf';
en['song.wordlist.action_put'] = 'Put';
en['song.wordlist.action_wash'] = 'Wash';
en['song.wordlist.action_pat'] = 'Pat';
en['song.wordlist.action_sing'] = 'Sing';
en['song.wordlist.action_tidy'] = 'Tidy';
en['song.wordlist.action_water'] = 'Water';

en['picture_set.everyday_objects.title'] = 'Everyday Objects';
en['picture_set.everyday_objects.alt_parent'] = 'Pictures of everyday objects.';
en['picture_set.colour_garden.title'] = 'Colour Garden';
en['picture_set.colour_garden.alt_parent'] = 'Pictures of colourful flowers and objects.';
en['picture_set.sorting.title'] = 'Sorting Basket';
en['picture_set.sorting.alt_parent'] = 'Pictures for sorting into two groups.';
en['picture_set.routine_cards.title'] = 'Now and Next Cards';
en['picture_set.routine_cards.alt_parent'] = 'Two cards showing a now step and a next step.';
en['picture_set.home_things.title'] = 'Home Things';
en['picture_set.home_things.alt_parent'] = 'Pictures of friendly household things.';

en['mission.tidy_team.title'] = 'Tidy Team';
en['mission.tidy_team.parent_script'] =
  'Put the device down. Together with your child, choose one rule — colours first, or kinds on another day. Take turns: your child puts one thing in, you put one thing in, until six things sit in two groups. Name the two groups together out loud.';
en['mission.tidy_team.child_prompt'] = 'Let us put our things away in two groups together.';
en['mission.tidy_team.team_goal'] = 'Sort six friendly things into two groups as a team.';
en['mission.tidy_team.precheck'] =
  'Please confirm the floor is clear, the items are large and soft with no small parts, and a grown-up stays beside your child throughout.';
en['mission.tidy_team.return_ritual'] =
  'We did it together — Soli and Fern hum your song fragment with you.';
en['mission.tidy_team.safety_1'] = 'Check the floor for small objects before you begin.';
en['mission.tidy_team.safety_2'] = 'No climbing to reach high shelves — keep everything at child height.';
en['mission.tidy_team.safety_3'] =
  'If anything breaks or spills, stop and clean up together, celebrating the help.';

en['mission.table_helpers.title'] = 'Table Helpers';
en['mission.table_helpers.parent_script'] =
  'Put the device down. Together with your child, set out a simple table for a snack or meal a grown-up has already prepared. Now: napkins down together. Next: plates and cups down together. Name “Now, Next, done!” together.';
en['mission.table_helpers.child_prompt'] =
  'Let us set our table together, one light thing at a time.';
en['mission.table_helpers.team_goal'] =
  'Set a simple table together for a snack a grown-up has already prepared.';
en['mission.table_helpers.precheck'] =
  'Please confirm there is no glass, no knives, and no hot items on the table yet, and a grown-up stays beside your child throughout.';
en['mission.table_helpers.return_ritual'] =
  'Now, next, done — we did it together! Soli and Fern hum your goodnight song fragment with you.';
en['mission.table_helpers.safety_1'] = 'A grown-up places anything heavy, hot, or breakable.';
en['mission.table_helpers.safety_2'] = 'Your child carries one light, unbreakable item at a time.';
en['mission.table_helpers.safety_3'] = 'Dry wet hands before carrying anything.';
en['mission.table_helpers.safety_4'] = 'You can stop anytime and still celebrate together.';

en['mission.water_plants.title'] = 'Watering Team';
en['mission.water_plants.parent_script'] =
  'Put the device down. With a small, grown-up-filled vessel, care for a plant together: now a little drink, next a gentle wipe of the leaves. Use the highest level your home has — a small cup, a small watering can, or a damp cloth.';
en['mission.water_plants.child_prompt'] = 'Let us give our plant a small drink together.';
en['mission.water_plants.team_goal'] = 'Care for a plant together with a small drink and a gentle wipe.';
en['mission.water_plants.precheck'] =
  'Please confirm the plant is safe — not toxic, not spiky, within reach without climbing — any water is a small grown-up-filled amount, and a grown-up stays beside your child throughout.';
en['mission.water_plants.return_ritual'] =
  'The plant had its drink — we did it together! Soli and Fern hum your song fragment with you.';
en['mission.water_plants.safety_1'] = 'A grown-up checks the plant is not toxic or spiky first.';
en['mission.water_plants.safety_2'] = 'No tasting soil — watering is for the plant only.';
en['mission.water_plants.safety_3'] = 'Wipe spills immediately and keep water away from sockets and devices.';

en['routine.goodnight_garden.title'] = 'Goodnight Garden';
en['routine.goodnight_garden.parent_script'] =
  'A calm, parent-led wind-down. On the device: Fern shows three picture cards and sings the first line of the goodnight song. Then put the device down — the routine does not need the screen after the start.';
en['routine.goodnight_garden.child_prompt'] =
  'Let us get ready for bed together, one kind step at a time.';
en['routine.goodnight_garden.team_goal'] =
  'Wind down for bed together: tidy one thing, share a quiet book or song, and dim the lights.';
en['routine.goodnight_garden.return_ritual'] =
  'You came back! Soli and Fern sing your song fragment together to welcome you.';
en['routine.goodnight_garden.safety_1'] =
  'Keep the lights low and soft for the last step, and an adult stays with the child until they are settled.';
en['routine.goodnight_garden.goodnight_phrase'] = 'Goodnight, garden, goodnight!';

en['time_concept.now_next.title'] = 'Now and Next';
en['time_concept.now_next.prompt'] = 'First we tidy now, and next we sing together.';

itemKeys();

const strings = { record_type: 'strings', version: V, locales: { 'en-US': en } };

function itemById(id) {
  return ITEMS.find((it) => it.id === id);
}

function picItem(it) {
  return {
    item_id: it.id,
    label_ref: `item.${itemKey(it.id)}.label`,
    alt_text_parent_ref: `item.${itemKey(it.id)}.alt_parent`,
    asset_path: `assets/${it.asset}`,
    asset_sha256: null,
    size_class: it.size,
    passes_choke_tube_proxy: true,
    depiction_tags: it.tags,
  };
}

const pictureSets = [
  { id: 'everyday-objects-set', title: 'picture_set.everyday_objects.title', alt: 'picture_set.everyday_objects.alt_parent', tags: ['household_safe'], itemIds: ['cup', 'spoon', 'book', 'ball'] },
  { id: 'colour-garden-set', title: 'picture_set.colour_garden.title', alt: 'picture_set.colour_garden.alt_parent', tags: ['household_safe'], itemIds: ['red-flower', 'yellow-flower', 'blue-flower', 'green-flower', 'red-ball', 'yellow-cup', 'blue-book', 'green-leaf'] },
  { id: 'sorting-set', title: 'picture_set.sorting.title', alt: 'picture_set.sorting.alt_parent', tags: ['household_safe'], itemIds: ['red-basket', 'yellow-basket', 'sort-red-ball', 'sort-red-sock', 'sort-yellow-cup', 'sort-yellow-book', 'sort-blue-spoon', 'sort-blue-leaf'] },
  { id: 'routine-cards-set', title: 'picture_set.routine_cards.title', alt: 'picture_set.routine_cards.alt_parent', tags: ['household_safe'], itemIds: ['now-tidy-card', 'next-song-card'] },
  { id: 'home-things-set', title: 'picture_set.home_things.title', alt: 'picture_set.home_things.alt_parent', tags: ['household_safe'], itemIds: ['laundry-basket', 'cardboard-box', 'flat-towel', 'soft-toy', 'book-stack', 'clean-socks', 'plastic-plate', 'paper-plate', 'placemat', 'plastic-cup', 'paper-cup', 'cloth-napkin', 'paper-towel-sheet', 'tea-towel', 'watering-can', 'damp-cloth', 'indoor-plant', 'outdoor-plant', 'night-lamp', 'closed-curtains', 'quiet-book', 'song-time-card', 'helping-hands'] },
];

const skills = [
  { id: 'everyday-object-words', title: 'skill.everyday_object_words.title', description: 'skill.everyday_object_words.description', domain: 'language', is_entry_skill: true, prerequisites: [], next_skills: ['colour-naming'], age_band_min: '2-3' },
  { id: 'colour-naming', title: 'skill.colour_naming.title', description: 'skill.colour_naming.description', domain: 'language', is_entry_skill: false, prerequisites: ['everyday-object-words'], next_skills: ['sorting-one-rule'], age_band_min: '3-4' },
  { id: 'sorting-one-rule', title: 'skill.sorting_one_rule.title', description: 'skill.sorting_one_rule.description', domain: 'social_cooperative', is_entry_skill: false, prerequisites: ['colour-naming'], next_skills: ['sequencing-now-next'], age_band_min: '3-4' },
  { id: 'sequencing-now-next', title: 'skill.sequencing_now_next.title', description: 'skill.sequencing_now_next.description', domain: 'time_concepts', is_entry_skill: false, prerequisites: ['sorting-one-rule'], next_skills: [], age_band_min: '3-4' },
];

const scaffolds = {
  '0': { level: 0, mode: 'full_task', prompt_ref: 'scaffold.l0.prompt', max_choices: 4, highlight_target: false, model_demonstration: false, child_final_tap_required: true },
  '1': { level: 1, mode: 'fewer_choices', prompt_ref: 'scaffold.l1.prompt', max_choices: 2, highlight_target: false, model_demonstration: false, child_final_tap_required: true },
  '2': { level: 2, mode: 'highlight_and_model', prompt_ref: 'scaffold.l2.prompt', max_choices: 2, highlight_target: true, model_demonstration: true, child_final_tap_required: true },
  '3': { level: 3, mode: 'do_together_final_tap', prompt_ref: 'scaffold.l3.prompt', max_choices: 1, highlight_target: true, model_demonstration: true, child_final_tap_required: true },
};

function lessonSteps(id, stepDefs) {
  return stepDefs.map((def, idx) => ({
    step_index: idx + 1,
    prompt_ref: `lesson.${id}.step_${idx + 1}.prompt`,
    target_item_id: def.target,
    choice_item_ids: def.choices,
    celebration_ref: `lesson.${id}.step_${idx + 1}.celebration`,
  }));
}

const lessons = [
  {
    id: 'lesson-hello-cup', title: 'lesson.hello_cup.title', primary_skill_id: 'everyday-object-words', secondary_skill_ids: [],
    interaction_type: 'tap_choice', character_id: 'soli', picture_set_id: 'everyday-objects-set', song_template_id: 'our-colour-song',
    fallback_lesson_id: 'lesson-hello-cup', fallback_picture_id: 'everyday-objects-set',
    steps: [
      { target: 'cup', choices: ['cup'] },
      { target: 'cup', choices: ['cup', 'ball'] },
      { target: 'cup', choices: ['cup'] },
      { target: 'cup', choices: ['cup', 'spoon', 'book'] },
      { target: 'cup', choices: ['cup'] },
    ],
  },
  {
    id: 'lesson-red-flower-yellow-flower', title: 'lesson.red_flower_yellow_flower.title', primary_skill_id: 'colour-naming', secondary_skill_ids: ['everyday-object-words'],
    interaction_type: 'tap_choice', character_id: 'soli', picture_set_id: 'colour-garden-set', song_template_id: 'our-colour-song',
    fallback_lesson_id: 'lesson-hello-cup', fallback_picture_id: 'everyday-objects-set',
    steps: [
      { target: 'red-flower', choices: ['red-flower', 'yellow-flower'] },
      { target: 'red-flower', choices: ['red-flower', 'yellow-flower', 'blue-flower'] },
      { target: 'red-flower', choices: ['red-flower'] },
      { target: 'red-ball', choices: ['red-ball', 'yellow-cup', 'blue-book'] },
      { target: 'red-flower', choices: ['red-flower', 'yellow-flower'] },
    ],
  },
  {
    id: 'lesson-where-does-this-go', title: 'lesson.where_does_this_go.title', primary_skill_id: 'sorting-one-rule', secondary_skill_ids: ['colour-naming'],
    interaction_type: 'sort_group', character_id: 'fern', picture_set_id: 'sorting-set', song_template_id: 'our-colour-song',
    fallback_lesson_id: 'lesson-red-flower-yellow-flower', fallback_picture_id: 'colour-garden-set',
    steps: [
      { target: 'red-basket', choices: ['red-basket', 'yellow-basket'] },
      { target: 'sort-red-ball', choices: ['sort-red-ball', 'sort-yellow-cup', 'sort-blue-spoon'] },
      { target: 'sort-red-sock', choices: ['sort-red-sock', 'sort-yellow-book', 'sort-blue-leaf'] },
      { target: 'sort-yellow-book', choices: ['sort-yellow-book', 'sort-yellow-cup', 'sort-blue-leaf'] },
      { target: 'red-basket', choices: ['red-basket', 'yellow-basket'] },
    ],
  },
  {
    id: 'lesson-now-next', title: 'lesson.now_next.title', primary_skill_id: 'sequencing-now-next', secondary_skill_ids: ['sorting-one-rule'],
    interaction_type: 'do_together', character_id: 'fern', picture_set_id: 'routine-cards-set', song_template_id: 'our-goodnight-song',
    fallback_lesson_id: 'lesson-where-does-this-go', fallback_picture_id: 'sorting-set',
    steps: [
      { target: 'next-song-card', choices: ['now-tidy-card', 'next-song-card'] },
      { target: 'now-tidy-card', choices: ['now-tidy-card', 'next-song-card'] },
      { target: 'next-song-card', choices: ['now-tidy-card', 'next-song-card'] },
      { target: 'now-tidy-card', choices: ['now-tidy-card', 'next-song-card'] },
      { target: 'next-song-card', choices: ['now-tidy-card', 'next-song-card'] },
    ],
  },
];

const songTemplates = [
  {
    id: 'our-colour-song', title_ref: 'song.our_colour_song.title', lesson_word_ref: 'song.our_colour_song.lesson_word',
    pentatonic_set_id: 'c_major_pentatonic', note_slots_total: 8, child_slots: 3,
    completion_rule_id: 'resolve_to_tonic', tempo: 104, timbre: 'felt_piano',
    name_wordlist_id: 'colour-object-wordlist',
    wordlists: { adjective_refs: ['song.wordlist.colour_red', 'song.wordlist.colour_yellow', 'song.wordlist.colour_blue', 'song.wordlist.colour_green'], noun_refs: ['song.wordlist.object_cup', 'song.wordlist.object_spoon', 'song.wordlist.object_book', 'song.wordlist.object_ball', 'song.wordlist.object_sock', 'song.wordlist.object_leaf'] },
    base_notes: ['C4', 'D4', 'E4', 'G4', 'E4', 'D4', 'E4', 'C4'],
  },
  {
    id: 'our-goodnight-song', title_ref: 'song.our_goodnight_song.title', lesson_word_ref: 'song.our_goodnight_song.lesson_word',
    pentatonic_set_id: 'c_major_pentatonic', note_slots_total: 8, child_slots: 3,
    completion_rule_id: 'resolve_to_tonic', tempo: 78, timbre: 'soft_kalimba',
    name_wordlist_id: 'colour-object-wordlist',
    wordlists: { adjective_refs: ['song.wordlist.colour_red', 'song.wordlist.colour_yellow', 'song.wordlist.colour_blue', 'song.wordlist.colour_green'], noun_refs: ['song.wordlist.object_cup', 'song.wordlist.object_spoon', 'song.wordlist.object_book', 'song.wordlist.object_ball', 'song.wordlist.object_sock', 'song.wordlist.object_leaf'] },
    base_notes: ['C4', 'D4', 'E4', 'D4', 'E4', 'G4', 'E4', 'C4'],
  },
];

const characters = [
  {
    id: 'soli', name_ref: 'character.soli.name', species_or_role: 'lantern_guide',
    appearance: { silhouette_shape: 'rounded_lantern', primary_palette: 'meadow_gold', distinctive_prop: 'felt_drum' },
    voice_profile: { register: 'warm_alto', pacing_wpm: 118, synth_fallback_enabled: true },
    personality_lines: ['character.soli.line_1', 'character.soli.line_2'],
    world_home_id: 'sunny-home-garden', model_asset_path: 'assets/soli.svg', fallback_character_id: null,
    originality_attestation: {
      attester: 'kilo',
      date: '2026-10-26',
      derivation_statement: 'Original round sun-sprite design with leaf-ears and a sun hand drum, authored for this pack only; not derived from any existing character.',
    },
  },
  {
    id: 'fern', name_ref: 'character.fern.name', species_or_role: 'routine_helper',
    appearance: { silhouette_shape: 'bell_pebble', primary_palette: 'sage_coral', distinctive_prop: 'story_leaf' },
    voice_profile: { register: 'soft_mezzo', pacing_wpm: 100, synth_fallback_enabled: true },
    personality_lines: ['character.fern.line_1', 'character.fern.line_2'],
    world_home_id: 'sunny-home-garden', model_asset_path: 'assets/fern.svg', fallback_character_id: null,
    originality_attestation: {
      attester: 'kilo',
      date: '2026-10-26',
      derivation_statement: 'Original tall teardrop garden-sprite design with drooping leaf-ears and a sorting basket, authored for this pack only; not derived from any existing character.',
    },
  },
];

function obj(primary, label, alt, altPic, fallback, fallbackPic) {
  return {
    object_id: primary,
    picture_ref: primary,
    label_ref: `item.${itemKey(label)}.label`,
    alternative_object_id: alt,
    alternative_picture_ref: altPic,
    fallback_body_action_id: fallback,
    fallback_body_picture_ref: fallbackPic,
  };
}

const missions = [
  {
    id: 'mission-tidy-team', title_ref: 'mission.tidy_team.title', skill_id: 'sorting-one-rule',
    parent_script_ref: 'mission.tidy_team.parent_script', child_prompt_ref: 'mission.tidy_team.child_prompt',
    team_goal_ref: 'mission.tidy_team.team_goal', return_ritual_ref: 'mission.tidy_team.return_ritual',
    parent_precheck: { required: true, prompt_ref: 'mission.tidy_team.precheck', space_clear_check: true, adult_present_check: true },
    parent_gate_required: true, estimated_minutes: 3, cooperative_only: true,
    song_id: 'our-colour-song', song_fallback_rule: 'use_lesson_song_template',
    safety_notes_refs: ['mission.tidy_team.safety_1', 'mission.tidy_team.safety_2', 'mission.tidy_team.safety_3'],
    objects: [
      obj('laundry-basket', 'laundry-basket', 'cardboard-box', 'cardboard-box', 'flat-towel', 'flat-towel'),
      obj('soft-toy', 'soft-toy', 'book-stack', 'book-stack', 'clean-socks', 'clean-socks'),
    ],
  },
  {
    id: 'mission-table-helpers', title_ref: 'mission.table_helpers.title', skill_id: 'sequencing-now-next',
    parent_script_ref: 'mission.table_helpers.parent_script', child_prompt_ref: 'mission.table_helpers.child_prompt',
    team_goal_ref: 'mission.table_helpers.team_goal', return_ritual_ref: 'mission.table_helpers.return_ritual',
    parent_precheck: { required: true, prompt_ref: 'mission.table_helpers.precheck', space_clear_check: true, adult_present_check: true },
    parent_gate_required: true, estimated_minutes: 3, cooperative_only: true,
    song_id: 'our-goodnight-song', song_fallback_rule: 'use_lesson_song_template',
    safety_notes_refs: ['mission.table_helpers.safety_1', 'mission.table_helpers.safety_2', 'mission.table_helpers.safety_3', 'mission.table_helpers.safety_4'],
    objects: [
      obj('plastic-plate', 'plastic-plate', 'paper-plate', 'paper-plate', 'placemat', 'placemat'),
      obj('plastic-cup', 'plastic-cup', 'paper-cup', 'paper-cup', 'cloth-napkin', 'cloth-napkin'),
      obj('cloth-napkin', 'cloth-napkin', 'paper-towel-sheet', 'paper-towel-sheet', 'tea-towel', 'tea-towel'),
    ],
  },
  {
    id: 'mission-water-plants', title_ref: 'mission.water_plants.title', skill_id: 'sequencing-now-next',
    parent_script_ref: 'mission.water_plants.parent_script', child_prompt_ref: 'mission.water_plants.child_prompt',
    team_goal_ref: 'mission.water_plants.team_goal', return_ritual_ref: 'mission.water_plants.return_ritual',
    parent_precheck: { required: true, prompt_ref: 'mission.water_plants.precheck', space_clear_check: true, adult_present_check: true },
    parent_gate_required: true, estimated_minutes: 3, cooperative_only: true,
    song_id: 'our-goodnight-song', song_fallback_rule: 'use_lesson_song_template',
    safety_notes_refs: ['mission.water_plants.safety_1', 'mission.water_plants.safety_2', 'mission.water_plants.safety_3'],
    objects: [
      obj('plastic-cup', 'plastic-cup', 'watering-can', 'watering-can', 'damp-cloth', 'damp-cloth'),
      obj('indoor-plant', 'indoor-plant', 'outdoor-plant', 'outdoor-plant', 'damp-cloth', 'damp-cloth'),
    ],
  },
];

const routines = [
  {
    id: 'routine-goodnight-garden', title_ref: 'routine.goodnight_garden.title', anchor: 'bedtime_winddown', time_of_day: 'evening',
    skill_id: 'sequencing-now-next', parent_script_ref: 'routine.goodnight_garden.parent_script',
    child_prompt_ref: 'routine.goodnight_garden.child_prompt', team_goal_ref: 'routine.goodnight_garden.team_goal',
    cooperative_only: true, song_id: 'our-goodnight-song', song_fallback_rule: 'use_lesson_song_template',
    return_ritual_ref: 'routine.goodnight_garden.return_ritual',
    safety_notes_refs: ['routine.goodnight_garden.safety_1'],
    objects: [
      obj('soft-toy', 'soft-toy', 'book-stack', 'book-stack', 'helping-hands', 'helping-hands'),
      obj('quiet-book', 'quiet-book', 'song-time-card', 'song-time-card', 'helping-hands', 'helping-hands'),
      obj('night-lamp', 'night-lamp', 'closed-curtains', 'closed-curtains', 'helping-hands', 'helping-hands'),
    ],
  },
];

const timeConcepts = [
  {
    id: 'concept-now-next', concept_key: 'now_next', title_ref: 'time_concept.now_next.title',
    prompt_ref: 'time_concept.now_next.prompt', picture_set_id: 'routine-cards-set',
  },
];

function common(recordType, id) {
  return {
    id, record_type: recordType, version: V, locale: LOCALE, age_band: AGE,
    status: 'draft', tags: ['pack-1', 'sunny-home-garden'], ...author,
  };
}

function buildRecords() {
  const skillsJson = skills.map((s) => ({
    ...common('skill', s.id),
    title_ref: s.title, description_ref: s.description, domain: s.domain,
    is_entry_skill: s.is_entry_skill, prerequisites: s.prerequisites, next_skills: s.next_skills,
    age_band_min: s.age_band_min, evidence_needed_to_advance: 3, catch_up_variant_of: null,
  }));

  const lessonsJson = lessons.map((l) => ({
    ...common('lesson', l.id),
    title_ref: l.title, primary_skill_id: l.primary_skill_id, secondary_skill_ids: l.secondary_skill_ids,
    interaction_type: l.interaction_type, character_id: l.character_id, picture_set_id: l.picture_set_id,
    song_template_id: l.song_template_id, mission_id: null, routine_id: null,
    estimated_minutes: 5, chunk_budget_minutes: 5,
    fallback_lesson_id: l.fallback_lesson_id, fallback_picture_id: l.fallback_picture_id,
    closing_win_ref: `lesson.${l.id.replace('lesson-', '').replace(/-/g, '_')}.closing_win`,
    steps: lessonSteps(l.id.replace('lesson-', '').replace(/-/g, '_'), l.steps),
    scaffolds,
  }));

  const songTemplatesJson = songTemplates.map((t) => ({ ...common('song_template', t.id), ...t }));

  const charactersJson = characters.map((c) => ({ ...common('character', c.id), ...c }));

  const pictureSetsJson = pictureSets.map((ps) => ({
    ...common('picture_set', ps.id),
    title_ref: ps.title, alt_text_parent_ref: ps.alt, depiction_tags: ps.tags,
    items: ps.itemIds.map((iid) => picItem(itemById(iid))),
  }));

  const missionsJson = missions.map((m) => ({ ...common('mission', m.id), ...m }));
  const routinesJson = routines.map((r) => ({ ...common('routine', r.id), ...r }));
  const timeConceptsJson = timeConcepts.map((tc) => ({
    ...common('time_concept', tc.id),
    ...tc,
    age_band: '2-3',
  }));
  const savedSongsJson = [];

  return { skillsJson, lessonsJson, songTemplatesJson, charactersJson, pictureSetsJson, missionsJson, routinesJson, timeConceptsJson, savedSongsJson };
}

function main() {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIR, 'assets'), { recursive: true });

  const assetContents = {};
  for (const [filename, spec] of Object.entries(ASSETS)) {
    if (spec.kind === 'reuse') {
      assetContents[filename] = fs.readFileSync(path.join(CORE, spec.from), 'utf8');
    } else {
      assetContents[filename] = svg(spec.color, spec.shape);
    }
    fs.writeFileSync(path.join(DIR, 'assets', filename), assetContents[filename]);
  }

  const { skillsJson, lessonsJson, songTemplatesJson, charactersJson, pictureSetsJson, missionsJson, routinesJson, timeConceptsJson, savedSongsJson } = buildRecords();

  for (const ps of pictureSetsJson) {
    for (const it of ps.items) {
      it.asset_sha256 = sha256(assetContents[it.asset_path.replace('assets/', '')]);
    }
  }

  const recordFiles = {
    'strings.json': strings,
    'skills.json': skillsJson,
    'lessons.json': lessonsJson,
    'song_templates.json': songTemplatesJson,
    'characters.json': charactersJson,
    'picture_sets.json': pictureSetsJson,
    'missions.json': missionsJson,
    'routines.json': routinesJson,
    'time_concepts.json': timeConceptsJson,
    'saved_songs.json': savedSongsJson,
  };

  for (const [filename, data] of Object.entries(recordFiles)) {
    fs.writeFileSync(path.join(DIR, filename), JSON.stringify(data, null, 2) + '\n');
  }

  const fileHashes = {};
  for (const [filename, content] of Object.entries(assetContents)) {
    fileHashes[`assets/${filename}`] = sha256(content);
  }
  for (const filename of Object.keys(recordFiles)) {
    fileHashes[filename] = sha256(fs.readFileSync(path.join(DIR, filename), 'utf8'));
  }

  const packSha = sha256(
    Object.entries(fileHashes).map(([p, h]) => `${p}:${h}`).join('\n')
  );

  const manifest = {
    ...common('manifest', 'sunny-home-garden'),
    title_ref: 'pack.sunny_home_garden.title',
    summary_ref: 'pack.sunny_home_garden.summary',
    schema_version: '1.0.0',
    supported_schema_versions: ['1.0.0'],
    locale: LOCALE,
    default_locale: LOCALE,
    locales_available: [LOCALE],
    demo: false,
    parent_gate_required: true,
    retired_ids: [],
    dependencies: [],
    file_hashes: fileHashes,
    pack_sha256: packSha,
  };
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log('Wrote', Object.keys(assetContents).length, 'assets and', Object.keys(recordFiles).length + 1, 'record files to', DIR);
  console.log('pack_sha256:', packSha);
}

main();
